use crate::state::DbConnection;
use core_rs::social::backup::{BackupMetadata, BackupService};
use tauri::State;

#[tauri::command]
pub fn create_backup_cmd(db: State<DbConnection>, space_id: String) -> Result<BackupMetadata, String> {
    crate::with_db!(db, conn, {
         let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
         let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
         if dek.is_empty() { return Err("DEK not available".to_string()); }

        let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
        let backup_id = service.create_backup(&conn, dek, Some(&space_id)).map_err(|e| e.to_string())?;
        service.get_backup_details(&backup_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn restore_backup_cmd(db: State<DbConnection>, backup_id: String) -> Result<(), String> {
    crate::with_db_mut!(db, conn, {
         let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
         let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
         if dek.is_empty() { return Err("DEK not available".to_string()); }

        let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
        service.restore_backup(&backup_id, &mut conn, dek).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn list_backups_cmd(_db: State<DbConnection>, _space_id: String) -> Result<Vec<BackupMetadata>, String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    let backups = service.list_backups().map_err(|e| e.to_string())?;
    Ok(backups.into_iter().map(|(_, m)| m).collect())
}

#[tauri::command]
pub fn delete_backup_cmd(_db: State<DbConnection>, backup_id: String) -> Result<(), String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    service.delete_backup(&backup_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_backup_details_cmd(_db: State<DbConnection>, backup_id: String) -> Result<BackupMetadata, String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    service.get_backup_details(&backup_id).map_err(|e| e.to_string())
}
