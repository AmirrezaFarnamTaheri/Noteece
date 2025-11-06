use core_rs::vault::{create_vault, unlock_vault};
use tempfile::tempdir;

#[test]
#[ignore]
fn test_create_and_unlock_vault() {
    let dir = tempdir().unwrap();
    let vault_path = dir.path().to_str().unwrap();
    let vault_key = "test-key";

    create_vault(vault_path, vault_key).unwrap();
    unlock_vault(vault_path, vault_key).unwrap();
}
