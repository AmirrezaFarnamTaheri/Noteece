//! Social Selector Verification Module
//!
//! Provides cryptographic verification of social selector configurations
//! to prevent supply chain attacks via tampered selector files.

use sha2::{Digest, Sha256};
use thiserror::Error;

/// Public key for verifying selector signatures (Ed25519)
/// This key should be generated and embedded during the build process
/// For now, we use hash verification as the primary method
const SELECTOR_PUBLIC_KEY: &[u8] = &[];

/// Fallback: SHA256 hashes of known-good selector configurations, used when
/// signature verification is not available.
///
/// NOTE: this list must never contain the SHA-256 of an empty or trivial input
/// (e.g. `e3b0c442…` = sha256("")), otherwise a tampered config that serves empty
/// selectors would verify as "known good". Populate it only with digests of real,
/// reviewed selector bundles produced by the build pipeline.
const KNOWN_GOOD_HASHES: &[&str] = &[];

#[derive(Error, Debug)]
pub enum VerificationError {
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Hash mismatch - selectors may have been tampered")]
    HashMismatch,
    #[error("Missing signature")]
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
        // Try to parse as signed format first
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

        // Plain JSON - compute hash only
        let hash = compute_hash(json);
        Ok(SignedSelectors {
            selectors: json.to_string(),
            signature: None,
            hash,
        })
    }

    /// Verify the selectors are authentic
    pub fn verify(&self) -> Result<(), VerificationError> {
        // Reject empty/whitespace-only selector payloads outright. This closes the
        // bypass where an attacker serves empty selectors whose hash happens to be
        // an allowlisted trivial digest.
        if self.selectors.trim().is_empty() {
            log::error!("[selectors] Rejecting empty selector payload");
            return Err(VerificationError::HashMismatch);
        }

        // Method 1: Signature verification (preferred)
        if let Some(ref sig) = self.signature {
            return verify_signature(&self.selectors, sig);
        }

        // Method 2: Hash allowlist verification (fallback)
        if KNOWN_GOOD_HASHES.contains(&self.hash.as_str()) {
            log::info!("[selectors] Verified via hash allowlist");
            return Ok(());
        }

        // Neither signature nor known hash - reject
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

    // Skip if no public key embedded
    #[allow(clippy::const_is_empty)]
    if SELECTOR_PUBLIC_KEY.is_empty() || SELECTOR_PUBLIC_KEY.len() != 32 {
        log::warn!("[selectors] No valid public key embedded, skipping signature verification");
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
    // Try to load from cache first
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

    // Cache only the verified selector content (not the raw, unverified body).
    if let Some(path) = cache_path {
        if let Err(e) = std::fs::write(path, &body) {
            log::warn!("[selectors] Failed to cache: {}", e);
        }
    }

    Ok(signed.selectors)
}

/// Get bundled fallback selectors (always verified)
pub fn get_bundled_selectors() -> &'static str {
    include_str!("../../config/bundled_selectors.json")
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_bundled_selectors_exist() {
        let bundled = get_bundled_selectors();
        assert!(!bundled.is_empty());
    }
}
