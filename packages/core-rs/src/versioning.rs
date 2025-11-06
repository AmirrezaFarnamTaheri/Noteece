use std::fs;
use std::path::Path;
use thiserror::Error;
use zstd;

#[derive(Error, Debug)]
pub enum VersioningError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

use ulid::Ulid;

pub fn create_snapshot(
    vault_path: &str,
    note_id: &str,
    content: &[u8],
) -> Result<(), VersioningError> {
    log::info!("[versioning] Creating snapshot for note: {}", note_id);
    let snapshot_dir = Path::new(vault_path).join("history").join(note_id);
    fs::create_dir_all(&snapshot_dir)?;
    let snapshot_id = Ulid::new();
    let snapshot_path = snapshot_dir.join(snapshot_id.to_string());
    let compressed_content = zstd::encode_all(content, 0)?;
    fs::write(snapshot_path, compressed_content)?;
    Ok(())
}

pub fn get_snapshots(vault_path: &str, note_id: &str) -> Result<Vec<String>, VersioningError> {
    log::info!("[versioning] Getting snapshots for note: {}", note_id);
    let snapshot_dir = Path::new(vault_path).join("history").join(note_id);
    let mut snapshots = Vec::new();
    for entry in fs::read_dir(snapshot_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            snapshots.push(path.file_name().unwrap().to_str().unwrap().to_string());
        }
    }
    Ok(snapshots)
}

pub fn restore_snapshot(
    vault_path: &str,
    note_id: &str,
    snapshot_id: &str,
) -> Result<Vec<u8>, VersioningError> {
    log::info!(
        "[versioning] Restoring snapshot {} for note: {}",
        snapshot_id,
        note_id
    );
    let snapshot_path = Path::new(vault_path)
        .join("history")
        .join(note_id)
        .join(snapshot_id);
    let compressed_content = fs::read(snapshot_path)?;
    let content = zstd::decode_all(&compressed_content[..])?;
    Ok(content)
}
