//! Social Selector Verification Module
//!
//! Provides cryptographic verification of social selector configurations to
//! prevent supply-chain attacks through tampered selector files.

use sha2::{Digest, Sha256};
use thiserror::Error;

/// Public key for verifying selector signatures (Ed25519).
///
/// A production signing key can be embedded in a future key-rotation release.
/// Until then, reviewed selector bundles are authenticated by exact SHA-256
/// digest. When a key is configured, invalid signatures remain hard failures.
const SELECTOR_PUBLIC_KEY: &[u8] = &[];

/// SHA-256 of the exact reviewed bytes shipped at
/// `packages/core-rs/config/bundled_selectors.json`.
const BUNDLED_SELECTORS_SHA256: &str =
    "65fa2b5c7f016b717c9c17efb89fd5293ec6385a804562f086ac1c520693e427";

/// SHA-256 hashes of reviewed selector configurations used when a signing key
/// is not embedded.
///
/// Every digest must correspond to an exact reviewed bundle and be covered by a
/// regression test. Never add hashes of empty, whitespace-only, placeholder, or
/// otherwise trivial content.
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

/// Signed selector configuration.
#[derive(Debug, Clone)]
pub struct SignedSelectors {
    pub selectors: String,
    pub signature: Option<Vec<u8>>,
    pub hash: String,
}

impl SignedSelectors {
    /// Parse either a signed selector envelope or a plain selector JSON bundle.
    pub fn parse(json: &str) -> Result<Self, VerificationError> {
        // Signed envelope format:
        // { "selectors": "<exact selector JSON>", "signature": "<base64>" }
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json) {
            if let Some(obj) = parsed.as_object() {
                if obj.contains_key("selectors") && obj.contains_key("signature") {
                    let selectors = obj
                        .get("selectors")
                        .and_then(|value| value.as_str())
                        .ok_or_else(|| VerificationError::ParseError("Missing selectors".into()))?;

                    let signature_b64 = obj
                        .get("signature")
                        .and_then(|value| value.as_str())
                        .unwrap_or("");

                    let signature = if signature_b64.is_empty() {
                        None
                    } else {
                        use base64::Engine;
                        Some(
                            base64::engine::general_purpose::STANDARD
                                .decode(signature_b64)
                                .map_err(|error| {
                                    VerificationError::ParseError(error.to_string())
                                })?,
                        )
                    };

                    return Ok(Self {
                        selectors: selectors.to_string(),
                        signature,
                        hash: compute_hash(selectors),
                    });
                }
            }
        }

        // Backwards-compatible plain bundle. Authenticity is still enforced by
        // the reviewed hash allowlist in `verify`.
        Ok(Self {
            selectors: json.to_string(),
            signature: None,
            hash: compute_hash(json),
        })
    }

    /// Verify that the selector content is authentic.
    pub fn verify(&self) -> Result<(), VerificationError> {
        if self.selectors.trim().is_empty() {
            log::error!("[selectors] Rejecting empty selector payload");
            return Err(VerificationError::HashMismatch);
        }

        // Signature verification is preferred. During the transitional
        // hash-pinned release, a signed envelope may be received before a public
        // key is embedded. Only that missing-key condition may fall through to
        // the reviewed hash; an invalid signature with a configured key is fatal.
        if let Some(signature) = self.signature.as_deref() {
            match verify_signature(&self.selectors, signature) {
                Ok(()) => return Ok(()),
                Err(VerificationError::MissingSignature) => {
                    log::warn!(
                        "[selectors] Signature present but no verification key is embedded; checking reviewed hash"
                    );
                }
                Err(error) => return Err(error),
            }
        }

        if KNOWN_GOOD_HASHES.contains(&self.hash.as_str()) {
            log::info!("[selectors] Verified via reviewed hash allowlist");
            return Ok(());
        }

        log::error!(
            "[selectors] Verification failed - unknown hash: {}",
            self.hash
        );
        Err(VerificationError::HashMismatch)
    }
}

/// Compute the SHA-256 digest of the exact selector bytes.
fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(hasher.finalize())
}

/// Verify an Ed25519 signature.
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

    let signature =
        Signature::from_slice(signature).map_err(|_| VerificationError::InvalidSignature)?;

    public_key
        .verify(content.as_bytes(), &signature)
        .map_err(|_| VerificationError::InvalidSignature)?;

    log::info!("[selectors] Signature verified successfully");
    Ok(())
}

/// Load and verify selectors from a remote URL, preferring a valid cache.
pub fn load_verified_selectors(
    url: &str,
    cache_path: Option<&std::path::Path>,
) -> Result<String, VerificationError> {
    if let Some(path) = cache_path {
        if path.exists() {
            match std::fs::read_to_string(path) {
                Ok(cached) => {
                    let signed = SignedSelectors::parse(&cached)?;
                    if signed.verify().is_ok() {
                        log::info!("[selectors] Using verified cached selectors");
                        return Ok(signed.selectors);
                    }
                    log::warn!("[selectors] Ignoring cache that failed verification");
                }
                Err(error) => {
                    log::warn!("[selectors] Failed to read cache: {}", error);
                }
            }
        }
    }

    // This API is intentionally blocking; bound both connection and total request
    // time so an unresponsive selector host cannot stall the caller indefinitely.
    log::info!("[selectors] Fetching from: {}", url);
    let client = reqwest::blocking::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|error| VerificationError::ParseError(error.to_string()))?;

    let response = client
        .get(url)
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|error| VerificationError::ParseError(error.to_string()))?;

    let body = response
        .text()
        .map_err(|error| VerificationError::ParseError(error.to_string()))?;

    let signed = SignedSelectors::parse(&body)?;
    signed.verify()?;

    // Cache the verified source representation. For a signed envelope this keeps
    // the signature available for re-verification on the next load.
    if let Some(path) = cache_path {
        if let Err(error) = std::fs::write(path, &body) {
            log::warn!("[selectors] Failed to cache verified selectors: {}", error);
        }
    }

    Ok(signed.selectors)
}

/// Return the selector bundle shipped with the application.
pub fn get_bundled_selectors() -> &'static str {
    include_str!("../../config/bundled_selectors.json")
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine as _;

    #[test]
    fn compute_hash_returns_sha256_hex() {
        assert_eq!(compute_hash("test content").len(), 64);
    }

    #[test]
    fn plain_json_is_parsed_without_a_signature() {
        let signed = SignedSelectors::parse(r#"{"twitter":{"post":".tweet"}}"#)
            .expect("plain JSON should parse");
        assert!(signed.signature.is_none());
        assert!(!signed.hash.is_empty());
    }

    #[test]
    fn bundled_selectors_match_the_reviewed_hash_and_verify() {
        let bundled = get_bundled_selectors();
        assert!(!bundled.trim().is_empty());
        assert_eq!(compute_hash(bundled), BUNDLED_SELECTORS_SHA256);

        SignedSelectors::parse(bundled)
            .expect("bundled selectors should parse")
            .verify()
            .expect("bundled selectors should match the reviewed hash");
    }

    #[test]
    fn signed_reviewed_bundle_falls_back_to_hash_without_an_embedded_key() {
        let envelope = serde_json::json!({
            "selectors": get_bundled_selectors(),
            "signature": base64::engine::general_purpose::STANDARD.encode([0_u8; 64]),
        })
        .to_string();

        let signed = SignedSelectors::parse(&envelope).expect("signed envelope should parse");
        assert!(signed.signature.is_some());
        signed
            .verify()
            .expect("reviewed content should remain usable before signing-key rollout");
    }

    #[test]
    fn empty_unknown_and_signed_tampered_payloads_are_rejected() {
        for payload in ["", "   \n", r#"{"twitter":{"post":".tampered"}}"#] {
            let signed = SignedSelectors::parse(payload).expect("parsing should not panic");
            assert!(matches!(
                signed.verify(),
                Err(VerificationError::HashMismatch)
            ));
        }

        let signed_tampered = serde_json::json!({
            "selectors": r#"{"twitter":{"post":".tampered"}}"#,
            "signature": base64::engine::general_purpose::STANDARD.encode([0_u8; 64]),
        })
        .to_string();
        let signed =
            SignedSelectors::parse(&signed_tampered).expect("signed envelope should parse");
        assert!(matches!(
            signed.verify(),
            Err(VerificationError::HashMismatch)
        ));
    }

    #[test]
    fn malformed_base64_signature_is_rejected_during_parsing() {
        let envelope = serde_json::json!({
            "selectors": get_bundled_selectors(),
            "signature": "not-valid-base64***",
        })
        .to_string();

        assert!(matches!(
            SignedSelectors::parse(&envelope),
            Err(VerificationError::ParseError(_))
        ));
    }
}
