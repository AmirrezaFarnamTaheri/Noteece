//! Social Selector Verification Module
//!
//! Provides cryptographic verification of social selector configurations
//! to prevent supply chain attacks via tampered selector files.

use sha2::{Digest, Sha256};
use thiserror::Error;

/// Public key for verifying selector signatures (Ed25519).
///
/// A production signing key can be embedded here in a future key-rotation release.
/// Until then, reviewed selector bundles are authenticated by exact SHA-256 digest.
const SELECTOR_PUBLIC_KEY: &[u8] = &[];

/// SHA-256 of the reviewed selector bundle shipped at
/// `packages/core-rs/config/bundled_selectors.json`.
const BUNDLED_SELECTORS_SHA256: &str =
    "130de5a43a78d92ac185f63149e11184bc41e1e74263270d082d1ebef2bff4c7";

/// Fallback SHA-256 hashes of reviewed selector configurations, used when a
/// signing key is not embedded.
///
/// This list must never contain the digest of empty, whitespace-only, or other
/// placeholder content. Every digest must be generated from an exact reviewed
/// bundle and covered by a regression test.
const KNOWN_GOOD_HASHES: &[&str] = &[BUNDLED_SELECTORS_SHA256];

#[derive(Error, Debug)]
pub enum VerificationError {
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Hash mismatch - selectors may have been tampered")]
    HashMismatch,
    #[error("Missing signature verification key")]
    MissingSignature,
    #[error("Parsing error: {0}")]
    ParseError(String),
}

/// Signed selector configuration
#[derive(Debug, Clone)]
pub struct SignedSelectors {
    pub selectors: String,
    pub signature: Option<Vec<u8>>,
    pub hash: String,
}

impl SignedSelectors {
    /// Parse signed selector JSON
    pub fn parse(json: &str) -> Result<Self, VerificationError> {
        // Try to parse as signed format first.
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json) {
            if let Some(obj) = parsed.as_object() {
                if obj.contains_key("selectors") && obj.contains_key("signature") {
                    let selectors = obj
                        .get("selectors")
                        .and_then(|v| v.as_str())
                        .ok_or_else(|| VerificationError::ParseError("Missing selectors".into()))?;

                    let sig_b64 = obj.get("signature").and_then(|v| v.as_str()).unwrap_or("");

                    let signature = if sig_b64.is_empty() {
                        None
                    } else {
                        use base64::Engine;
                        Some(
                            base64::engine::general_purpose::STANDARD
                                .decode(sig_b64)
                                .map_err(|e| VerificationError::ParseError(e.to_string()))?,
                        )
                    };

                    let hash = compute_hash(selectors);

                    return Ok(SignedSelectors {
                        selectors: selectors.to_string(),
                        signature,
                        hash,
                    });
                }
            }
        }

        // Plain JSON - compute hash only.
        let hash = compute_hash(json);
        Ok(SignedSelectors {
            selectors: json.to_string(),
            signature: None,
            hash,
        })
    }

    /// Verify the selectors are authentic.
    pub fn verify(&self) -> Result<(), VerificationError> {
        // Reject empty/whitespace-only selector payloads outright. This closes the
        // bypass where an attacker serves empty selectors whose hash happens to be
        // an allowlisted trivial digest.
        if self.selectors.trim().is_empty() {
            log::error!("[selectors] Rejecting empty selector payload");
            return Err(VerificationError::HashMismatch);
        }

        // Method 1: signature verification (preferred). During the transitional
        // hash-pinned release, a signed envelope may still contain the exact
        // reviewed bundle while no public key is embedded. Only that specific
        // missing-key condition may fall through to the hash allowlist; an invalid
        // signature with a configured key remains a hard failure.
        if let Some(ref sig) = self.signature {
            match verify_signature(&self.selectors, sig) {
                Ok(()) => return Ok(()),
                Err(VerificationError::MissingSignature) => {
                    log::warn!(
                        "[selectors] Signature present but no verification key is embedded; checking reviewed hash"
                    );
                }
                Err(error) => return Err(error),
            }
        }

        // Method 2: exact reviewed-bundle hash verification.
        if KNOWN_GOOD_HASHES.contains(&self.hash.as_str()) {
            log::info!("[selectors] Verified via reviewed hash allowlist");
            return Ok(());
        }

        // Neither a valid signature nor a reviewed hash - reject.
        log::error!(
            "[selectors] Verification failed - unknown hash: {}",
            self.hash
        );
        Err(VerificationError::HashMismatch)
    }
}

/// Compute SHA256 hash of content
fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// Verify Ed25519 signature
fn verify_signature(content: &str, signature: &[u8]) -> Result<(), VerificationError> {
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};

    #[allow(clippy::const_is_empty)]
    if SELECTOR_PUBLIC_KEY.len() != 32 {
        log::warn!("[selectors] No valid Ed25519 public key embedded");
        return Err(VerificationError::MissingSignature);
    }

    let public_key = VerifyingKey::from_bytes(
        SELECTOR_PUBLIC_KEY
            .try_into()
            .map_err(|_| VerificationError::InvalidSignature)?,
    )
    .map_err(|_| VerificationError::InvalidSignature)?;

    let sig = Signature::from_slice(signature).map_err(|_| VerificationError::InvalidSignature)?;

    public_key
        .verify(content.as_bytes(), &sig)
        .map_err(|_| VerificationError::InvalidSignature)?;

    log::info!("[selectors] Signature verified successfully");
    Ok(())
}

/// Load and verify selectors from remote URL with caching
pub fn load_verified_selectors(
    url: &str,
    cache_path: Option<&std::path::Path>,
) -> Result<String, VerificationError> {
    // Try to load from cache first.
    if let Some(path) = cache_path {
        if path.exists() {
            if let Ok(cached) = std::fs::read_to_string(path) {
                let signed = SignedSelectors::parse(&cached)?;
                if signed.verify().is_ok() {
                    log::info!("[selectors] Using cached selectors");
                    return Ok(signed.selectors);
                }
            }
        }
    }

    // Fetch from remote with a bounded timeout so a slow/unresponsive host cannot
    // hang the calling thread indefinitely (this is a blocking call).
    log::info!("[selectors] Fetching from: {}", url);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| VerificationError::ParseError(e.to_string()))?;
    let response = client
        .get(url)
        .send()
        .map_err(|e| VerificationError::ParseError(e.to_string()))?;

    let body = response
        .text()
        .map_err(|e| VerificationError::ParseError(e.to_string()))?;

    // Parse and verify before persisting anything.
    let signed = SignedSelectors::parse(&body)?;
    signed.verify()?;

    // Cache only verified content.
    if let Some(path) = cache_path {
        if let Err(e) = std::fs::write(path, &body) {
            log::warn!("[selectors] Failed to cache: {}", e);
        }
    }

    Ok(signed.selectors)
}

/// Get bundled fallback selectors. The bundle digest is pinned above and tested
/// below so accidental edits fail verification until deliberately reviewed.
pub fn get_bundled_selectors() -> &'static str {
    include_str!("../../config/bundled_selectors.json")
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine as _;

    #[test]
    fn test_compute_hash() {
        let hash = compute_hash("test content");
        assert_eq!(hash.len(), 64); // SHA256 hex
    }

    #[test]
    fn test_parse_plain_json() {
        let json = r#"{"twitter": {"post": ".tweet"}}"#;
        let signed = SignedSelectors::parse(json).expect("Valid JSON");
        assert!(signed.signature.is_none());
        assert!(!signed.hash.is_empty());
    }

    #[test]
    fn test_bundled_selectors_have_reviewed_hash_and_verify() {
        let bundled = get_bundled_selectors();
        assert!(!bundled.trim().is_empty());
        assert_eq!(compute_hash(bundled), BUNDLED_SELECTORS_SHA256);

        let signed = SignedSelectors::parse(bundled).expect("Bundled selectors must parse");
        signed
            .verify()
            .expect("Bundled selectors must match the reviewed hash");
    }

    #[test]
    fn test_signed_reviewed_bundle_falls_back_to_hash_without_embedded_key() {
        let envelope = serde_json::json!({
            "selectors": get_bundled_selectors(),
            "signature": base64::engine::general_purpose::STANDARD.encode([0_u8; 64]),
        })
        .to_string();

        let signed = SignedSelectors::parse(&envelope).expect("Signed envelope must parse");
        assert!(signed.signature.is_some());
        signed
            .verify()
            .expect("Reviewed bundle must remain usable before signing-key rollout");
    }

    #[test]
    fn test_empty_and_unknown_selector_payloads_are_rejected() {
        for payload in ["", "   \n", r#"{"twitter":{"post":".tampered"}}"#] {
            let signed = SignedSelectors::parse(payload).expect("Payload parsing must not panic");
            assert!(matches!(
                signed.verify(),
                Err(VerificationError::HashMismatch)
            ));
        }
    }
}
