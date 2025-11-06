use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    XChaCha20Poly1305,
};
use hkdf::Hkdf;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use thiserror::Error;

const CHUNK_SIZE: usize = 4096;

#[derive(Error, Debug)]
pub enum BlobError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Encryption error: {0}")]
    Encrypt(String),
    #[error("Hex error: {0}")]
    Hex(#[from] hex::FromHexError),
}

fn derive_blob_key(mk: &[u8], blob_hash: &[u8]) -> [u8; 32] {
    let hk = Hkdf::<Sha256>::new(Some(blob_hash), mk);
    let mut okm = [0u8; 32];
    hk.expand(&[], &mut okm).unwrap();
    okm
}

fn store_chunk(vault_path: &str, mk: &[u8], chunk: &[u8]) -> Result<String, BlobError> {
    log::info!("[blob] Storing chunk of size: {}", chunk.len());
    let hash = Sha256::digest(chunk);
    let hex_hash = hex::encode(hash);

    let chunk_key = derive_blob_key(mk, &hash);
    let cipher = XChaCha20Poly1305::new(&chunk_key.into());
    let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);
    let encrypted_content = cipher
        .encrypt(&nonce, chunk)
        .map_err(|e| BlobError::Encrypt(e.to_string()))?;

    let chunk_path = Path::new(vault_path).join("objects").join(&hex_hash[0..2]);
    fs::create_dir_all(&chunk_path)?;
    let chunk_file_path = chunk_path.join(&hex_hash[2..]);

    let mut content_to_store = nonce.to_vec();
    content_to_store.extend_from_slice(&encrypted_content);

    fs::write(chunk_file_path, content_to_store)?;
    log::info!("[blob] Stored chunk with hash: {}", hex_hash);
    Ok(hex_hash)
}

fn retrieve_chunk(vault_path: &str, mk: &[u8], hex_hash: &str) -> Result<Vec<u8>, BlobError> {
    log::info!("[blob] Retrieving chunk with hash: {}", hex_hash);
    let hash = hex::decode(hex_hash)?;
    let chunk_key = derive_blob_key(mk, &hash);
    let cipher = XChaCha20Poly1305::new(&chunk_key.into());

    let chunk_path = Path::new(vault_path).join("objects").join(&hex_hash[0..2]);
    let chunk_file_path = chunk_path.join(&hex_hash[2..]);
    let content_from_store = fs::read(chunk_file_path)?;

    if content_from_store.len() < 24 {
        return Err(BlobError::Encrypt("corrupt chunk: missing nonce".into()));
    }
    let (nonce_bytes, encrypted_content) = content_from_store.split_at(24);
    let nonce_array: [u8; 24] = match nonce_bytes.try_into() {
        Ok(n) => n,
        Err(_) => return Err(BlobError::Encrypt("invalid nonce length".into())),
    };

    let content = cipher
        .decrypt((&nonce_array).into(), encrypted_content)
        .map_err(|e| BlobError::Encrypt(e.to_string()))?;
    log::info!("[blob] Retrieved chunk with hash: {}", hex_hash);
    Ok(content)
}

pub fn store_blob(vault_path: &str, mk: &[u8], content: &[u8]) -> Result<String, BlobError> {
    log::info!("[blob] Storing blob of size: {}", content.len());
    let mut chunk_hashes = Vec::new();
    for chunk in content.chunks(CHUNK_SIZE) {
        let chunk_hash = store_chunk(vault_path, mk, chunk)?;
        chunk_hashes.push(chunk_hash);
    }

    let manifest = chunk_hashes.join("\n");
    let manifest_hash = Sha256::digest(manifest.as_bytes());
    let hex_manifest_hash = hex::encode(manifest_hash);

    let manifest_path = Path::new(vault_path)
        .join("objects")
        .join(&hex_manifest_hash[0..2]);
    fs::create_dir_all(&manifest_path)?;
    let manifest_file_path = manifest_path.join(&hex_manifest_hash[2..]);
    fs::write(manifest_file_path, manifest)?;

    Ok(hex_manifest_hash)
}

pub fn retrieve_blob(vault_path: &str, mk: &[u8], hex_hash: &str) -> Result<Vec<u8>, BlobError> {
    println!("[blob] Retrieving blob with hash: {}", hex_hash);
    let manifest_path = Path::new(vault_path).join("objects").join(&hex_hash[0..2]);
    let manifest_file_path = manifest_path.join(&hex_hash[2..]);
    let manifest = fs::read_to_string(manifest_file_path)?;

    let mut content = Vec::new();
    for chunk_hash in manifest.lines() {
        let chunk = retrieve_chunk(vault_path, mk, chunk_hash)?;
        content.extend_from_slice(&chunk);
    }

    Ok(content)
}
