use core_rs::backup::create_backup;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_backup() {
    let dir = tempdir().unwrap();
    let vault_path = dir.path().join("vault");
    fs::create_dir(&vault_path).unwrap();
    let backup_path = dir.path().join("backup.zip");

    // Create a dummy file in the vault to ensure there's something to back up.
    let dummy_file_path = vault_path.join("dummy.txt");
    fs::write(dummy_file_path, "dummy content").unwrap();

    create_backup(vault_path.to_str().unwrap(), backup_path.to_str().unwrap()).unwrap();

    assert!(fs::metadata(backup_path).unwrap().is_file());
}
