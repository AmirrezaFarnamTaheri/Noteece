use aes::Aes256;
use aes_kw::Kek;
use base64::Engine;
use pbkdf2::pbkdf2_hmac;
use rand::Rng;
use sha2::Sha512;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("AES-KW error: {0}")]
    AesKw(String),
}

impl From<aes_kw::Error> for CryptoError {
    fn from(err: aes_kw::Error) -> Self {
        CryptoError::AesKw(err.to_string())
    }
}

/// Derive a 32-byte key (KEK) from a password and 16+ byte salt via PBKDF2-HMAC-SHA512.
/// Iterations set to 256k (aligns with your SQLCipher KDF setting).
pub fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    log::info!("[crypto] Deriving key from password");
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha512>(password.as_bytes(), salt, 256_000, &mut key);
    log::info!("[crypto] Key derived successfully");
    key
}

/// Generate a random 32-byte Data Encryption Key (DEK).
pub fn generate_dek() -> [u8; 32] {
    log::info!("[crypto] Generating DEK");
    rand::random()
}

pub fn generate_recovery_key() -> [u8; 32] {
    log::info!("[crypto] Generating recovery key");
    rand::random()
}

/// Generate 10 printable recovery codes (base32, 10 bytes → ~16 chars each).
pub fn generate_recovery_codes(_rk: &[u8; 32]) -> Vec<String> {
    log::info!("[crypto] Generating recovery codes");
    let mut codes = Vec::with_capacity(10);
    for _ in 0..10 {
        let mut code_bytes = [0u8; 10];
        rand::thread_rng().fill(&mut code_bytes[..]);
        let code = base32::encode(base32::Alphabet::Rfc4648 { padding: false }, &code_bytes);
        codes.push(code);
    }
    codes
}

/// Wrap the DEK under the KEK using AES Key Wrap (RFC 3394).
pub fn wrap_dek(dek: &[u8; 32], kek: &[u8]) -> Result<Vec<u8>, CryptoError> {
    log::info!("[crypto] Wrapping DEK");
    let kek = Kek::<Aes256>::new(kek.into());
    let mut wrapped_dek = vec![0u8; dek.len() + 8];
    kek.wrap(dek, &mut wrapped_dek)?;
    Ok(wrapped_dek)
}

/// Unwrap the DEK using the KEK.
pub fn unwrap_dek(wrapped_dek: &[u8], kek: &[u8]) -> Result<[u8; 32], CryptoError> {
    log::info!("[crypto] Unwrapping DEK");
    let kek = Kek::<Aes256>::new(kek.into());
    let mut dek = [0u8; 32];
    kek.unwrap(wrapped_dek, &mut dek)?;
    Ok(dek)
}

/// Encrypt a string using the DEK (for sensitive data like passwords)
pub fn encrypt_string(plaintext: &str, dek: &[u8]) -> Result<String, CryptoError> {
    use chacha20poly1305::{
        aead::{Aead, AeadCore, KeyInit, OsRng},
        XChaCha20Poly1305,
    };

    if dek.len() != 32 {
        return Err(CryptoError::AesKw(format!(
            "Invalid DEK length: got {}, expected 32 bytes",
            dek.len()
        )));
    }

    let cipher = XChaCha20Poly1305::new(dek.into());
    let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| CryptoError::AesKw(e.to_string()))?;

    // Combine nonce + ciphertext and encode as base64
    let mut combined = nonce.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(base64::engine::general_purpose::STANDARD.encode(&combined))
}

/// Decrypt a string using the DEK
pub fn decrypt_string(encrypted: &str, dek: &[u8]) -> Result<String, CryptoError> {
    use chacha20poly1305::{
        aead::{Aead, KeyInit},
        XChaCha20Poly1305,
    };

    if dek.len() != 32 {
        return Err(CryptoError::AesKw(format!(
            "Invalid DEK length: got {}, expected 32 bytes",
            dek.len()
        )));
    }

    let combined = base64::engine::general_purpose::STANDARD
        .decode(encrypted)
        .map_err(|e| CryptoError::AesKw(format!("Base64 decode error: {}", e)))?;

    // XChaCha20Poly1305 nonce is 24 bytes, Poly1305 tag is 16 bytes
    const NONCE_LEN: usize = 24;
    const TAG_LEN: usize = 16;
    if combined.len() < NONCE_LEN + TAG_LEN {
        return Err(CryptoError::AesKw(
            "Invalid encrypted data: too short for nonce + tag".to_string(),
        ));
    }

    let (nonce_bytes, ciphertext) = combined.split_at(NONCE_LEN);
    let nonce = chacha20poly1305::XNonce::from_slice(nonce_bytes);

    let cipher = XChaCha20Poly1305::new(dek.into());
    let plaintext = cipher
        .decrypt(&nonce, ciphertext)
        .map_err(|e| CryptoError::AesKw(e.to_string()))?;

    String::from_utf8(plaintext)
        .map_err(|e| CryptoError::AesKw(format!("UTF-8 decode error: {}", e)))
}

/// Encrypt binary data using the DEK (returns Vec<u8>)
/// Handles arbitrary binary data without UTF-8 assumptions
pub fn encrypt_bytes(data: &[u8], dek: &[u8]) -> Result<Vec<u8>, CryptoError> {
    use chacha20poly1305::{
        aead::{Aead, AeadCore, KeyInit, OsRng},
        XChaCha20Poly1305,
    };

    if dek.len() != 32 {
        return Err(CryptoError::AesKw(format!(
            "Invalid DEK length: got {}, expected 32 bytes",
            dek.len()
        )));
    }

    let cipher = XChaCha20Poly1305::new(dek.into());
    let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, data)
        .map_err(|e| CryptoError::AesKw(e.to_string()))?;

    // Combine nonce + ciphertext (no base64 encoding - keeping as binary)
    let mut result = Vec::with_capacity(24 + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Decrypt binary data using the DEK
/// Works with arbitrary binary data without UTF-8 assumptions
pub fn decrypt_bytes(encrypted: &[u8], dek: &[u8]) -> Result<Vec<u8>, CryptoError> {
    use chacha20poly1305::{
        aead::{Aead, KeyInit},
        XChaCha20Poly1305,
    };

    if dek.len() != 32 {
        return Err(CryptoError::AesKw(format!(
            "Invalid DEK length: got {}, expected 32 bytes",
            dek.len()
        )));
    }

    // XChaCha20Poly1305 nonce is 24 bytes, authentication tag is 16 bytes
    const NONCE_LEN: usize = 24;
    const TAG_LEN: usize = 16;
    const MIN_CIPHERTEXT_LEN: usize = NONCE_LEN + TAG_LEN;

    if encrypted.len() < MIN_CIPHERTEXT_LEN {
        return Err(CryptoError::AesKw(
            "Invalid encrypted data: too short for nonce + tag".to_string(),
        ));
    }

    let (nonce_bytes, ciphertext) = encrypted.split_at(NONCE_LEN);

    // Defense-in-depth: Verify ciphertext is at least as long as auth tag
    // This ensures the ciphertext contains at least the authentication tag
    if ciphertext.len() < TAG_LEN {
        return Err(CryptoError::AesKw(
            "Invalid encrypted data: ciphertext shorter than authentication tag".to_string(),
        ));
    }

    let nonce = chacha20poly1305::XNonce::from_slice(nonce_bytes);

    let cipher = XChaCha20Poly1305::new(dek.into());
    let plaintext = cipher
        .decrypt(&nonce, ciphertext)
        .map_err(|e| CryptoError::AesKw(e.to_string()))?;

    Ok(plaintext)
}

// Remove the misleading hex-based shim to prevent accidental misuse.
