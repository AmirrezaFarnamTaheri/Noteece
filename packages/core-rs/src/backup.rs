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
}

pub fn create_backup(vault_path: &str, backup_path: &str) -> Result<(), BackupError> {
    log::info!(
        "[backup] Creating backup of vault: {} to {}",
        vault_path,
        backup_path
    );
    let backup_file = fs::File::create(backup_path)?;
    let mut zip = ZipWriter::new(backup_file);
    let options: FileOptions<'_, ()> =
        FileOptions::default().compression_method(CompressionMethod::Deflated);

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
