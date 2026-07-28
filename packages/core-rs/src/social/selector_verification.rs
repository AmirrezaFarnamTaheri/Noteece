//! Social Selector Verification Module
//!
//! Verifies selector configurations against reviewed integrity hashes.

use sha2::{Digest, Sha256};
use thiserror::Error;

const SELECTOR_PUBLIC_KEY: &[u8] = &[];
const BUNDLED_SELECTORS_SHA256: &str = "130de5a43a78d92ac185f63149e11184bc41e1e74263270d082d1ebef2bff4c7";
const KNOWN_GOOD_HASHES: &[&str] = &[BUNDLED_SELECTORS_SHA256];

#[derive(Error, Debug)]
pub enum VerificationError {
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Hash mismatch")]
    HashMismatch,
    #[error("Missing signature key")]
    MissingSignature,
    #[error("Parse error: {0}")]
    ParseError(String),
}

#[derive(Debug, Clone)]
pub struct SignedSelectors {
    pub selectors: String,
    pub signature: Option<Vec<u8>>,
    pub hash: String,
}

impl SignedSelectors {
    pub fn parse(json: &str) -> Result<Self, VerificationError> {
        let hash = compute_hash(json);
        Ok(Self {
            selectors: json.to_string(),
            signature: None,
            hash,
        })
    }

    pub fn verify(&self) -> Result<(), VerificationError> {
        if self.selectors.trim().is_empty() {
            return Err(VerificationError::HashMismatch);
        }
        if KNOWN_GOOD_HASHES.contains(&self.hash.as_str()) {
            return Ok(());
        }
        Err(VerificationError::HashMismatch)
    }
}

fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn get_bundled_selectors() -> &'static str {
    include_str!("../../config/bundled_selectors.json")
}

pub fn load_verified_selectors(
    _url: &str,
    cache_path: Option<&std::path::Path>,
) -> Result<String, VerificationError> {
    let bundled = get_bundled_selectors();
    let selectors = SignedSelectors::parse(bundled)?;
    selectors.verify()?;
    if let Some(path) = cache_path {
        let _ = std::fs::write(path, bundled);
    }
    Ok(bundled.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundled_selectors_are_verified() {
        let selectors = SignedSelectors::parse(get_bundled_selectors()).unwrap();
        assert_eq!(selectors.hash, BUNDLED_SELECTORS_SHA256);
        assert!(selectors.verify().is_ok());
    }

    #[test]
    fn empty_selectors_fail() {
        let selectors = SignedSelectors::parse("").unwrap();
        assert!(selectors.verify().is_err());
    }
}
