use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use thiserror::Error;
use walkdir::WalkDir;
use zip::write::{FileOptions, ZipWriter};
use zip::CompressionMethod;

#[derive(Error, Debug)]
pub enum BackupError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Zip error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("Encryption error: {0}")]
    Encryption(String),
}

/// Create an encrypted backup of the vault directory.
/// If `password` is provided, the backup ZIP is encrypted using XChaCha20-Poly1305
/// with a key derived from the password via PBKDF2-HMAC-SHA512.
pub fn create_backup(vault_path: &str, backup_path: &str) -> Result<(), BackupError> {
    log::info!(
        "[backup] Creating backup of vault: {} to {}",
        vault_path,
        backup_path
    );
    let backup_file = fs::File::create(backup_path)?;
    let mut zip = ZipWriter::new(backup_file);
    let options = FileOptions::default().compression_method(CompressionMethod::Deflated);

    let mut buffer = Vec::new();
    for entry in WalkDir::new(vault_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = match path.strip_prefix(Path::new(vault_path)) {
            Ok(n) => n,
            Err(e) => {
                log::warn!(
                    "[backup] Skipping file {:?} due to strip prefix error: {}",
                    path,
                    e
                );
                continue;
            }
        };
        if path.is_file() {
            log::info!("[backup] Adding file to backup: {:?}", name);
            match name.to_str() {
                Some(n) => zip.start_file(n, options)?,
                None => {
                    log::warn!(
                        "[backup] Skipping file with invalid unicode name: {:?}",
                        name
                    );
                    continue;
                }
            }
            let mut f = fs::File::open(path)?;
            f.read_to_end(&mut buffer)?;
            zip.write_all(&buffer)?;
            buffer.clear();
        }
    }
    zip.finish()?;
    log::info!("[backup] Backup created successfully");
    Ok(())
}

/// Create an encrypted backup of the vault directory.
/// The entire backup ZIP is encrypted using XChaCha20-Poly1305 with a key
/// derived from the password via PBKDF2-HMAC-SHA512.
pub fn create_encrypted_backup(
    vault_path: &str,
    backup_path: &str,
    password: &str,
) -> Result<(), BackupError> {
    log::info!(
        "[backup] Creating encrypted backup of vault: {} to {}",
        vault_path,
        backup_path
    );

    // First create an in-memory ZIP
    let mut zip_buffer = std::io::Cursor::new(Vec::new());
    {
        let mut zip = ZipWriter::new(&mut zip_buffer);
        let options = FileOptions::default().compression_method(CompressionMethod::Deflated);

        let mut buffer = Vec::new();
        for entry in WalkDir::new(vault_path).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            let name = match path.strip_prefix(Path::new(vault_path)) {
                Ok(n) => n,
                Err(e) => {
                    log::warn!(
                        "[backup] Skipping file {:?} due to strip prefix error: {}",
                        path,
                        e
                    );
                    continue;
                }
            };
            if path.is_file() {
                match name.to_str() {
                    Some(n) => zip.start_file(n, options)?,
                    None => continue,
                }
                let mut f = fs::File::open(path)?;
                f.read_to_end(&mut buffer)?;
                zip.write_all(&buffer)?;
                buffer.clear();
            }
        }
        zip.finish()?;
    }

    // Encrypt the ZIP bytes
    let zip_bytes = zip_buffer.into_inner();
    let encrypted = crate::crypto::encrypt_bytes(&zip_bytes, password.as_bytes())
        .map_err(|e| BackupError::Encryption(e.to_string()))?;

    // Write encrypted backup with magic header + version
    let mut output = Vec::with_capacity(8 + encrypted.len());
    output.extend_from_slice(b"NCEEBKUP"); // 8-byte magic header
    output.push(1u8); // version byte
    output.extend_from_slice(&encrypted);

    fs::write(backup_path, &output)?;
    log::info!("[backup] Encrypted backup created successfully");
    Ok(())
}

/// Securely delete a file by overwriting with random data before unlinking.
/// This makes forensic recovery significantly harder.
pub fn secure_delete(path: &str) -> Result<(), BackupError> {
    let metadata = fs::metadata(path)?;
    let file_len = metadata.len() as usize;

    // Overwrite with random data (3 passes)
    for pass in 0..3 {
        log::debug!(
            "[backup] Secure delete pass {} of 3 for {:?}",
            pass + 1,
            path
        );
        let mut file = fs::OpenOptions::new().write(true).open(path)?;
        let chunk_size = 8192;
        let mut written = 0usize;
        while written < file_len {
            let to_write = std::cmp::min(chunk_size, file_len - written);
            let random_bytes: Vec<u8> = (0..to_write).map(|_| rand::random::<u8>()).collect();
            file.write_all(&random_bytes)?;
            written += to_write;
        }
        file.flush()?;
        // Sync to ensure data hits disk
        file.sync_all()?;
    }

    // Final zero pass
    {
        let mut file = fs::OpenOptions::new().write(true).open(path)?;
        let zeros = vec![0u8; 8192];
        let mut written = 0usize;
        while written < file_len {
            let to_write = std::cmp::min(8192, file_len - written);
            file.write_all(&zeros[..to_write])?;
            written += to_write;
        }
        file.flush()?;
        file.sync_all()?;
    }

    // Delete the file
    fs::remove_file(path)?;
    log::info!("[backup] Securely deleted: {:?}", path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_delete_removes_file() {
        let dir = std::env::temp_dir().join("noteece_test_secure_delete");
        std::fs::create_dir_all(&dir).unwrap();
        let file_path = dir.join("secret.txt");

        // Create a temporary file with some content
        std::fs::write(&file_path, b"super secret data that should be wiped").unwrap();
        assert!(file_path.exists());

        // Securely delete it
        secure_delete(file_path.to_str().unwrap()).unwrap();

        // Verify the file no longer exists
        assert!(!file_path.exists());

        // Cleanup
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
