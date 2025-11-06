use core_rs::note::create_note;
use core_rs::space::create_space;
use core_rs::vault::{create_vault, unlock_vault};
use tempfile::tempdir;

#[test]
fn test_vault_lifecycle_and_persistence() {
    let dir = tempdir().unwrap();
    let vault_path = dir.path().to_str().unwrap();
    let password = "password";

    // 1. Create a new vault
    let mut vault = create_vault(vault_path, password).unwrap();

    // 2. Write some data to it
    let space_id = create_space(&mut vault.conn, "test_space").unwrap();
    let note = create_note(
        &vault.conn,
        &space_id.to_string(),
        "Test Note",
        "This is the content.",
    )
    .unwrap();
    let note_id = note.id;
    drop(vault);

    // 3. Unlock the vault
    let unlocked_vault = unlock_vault(vault_path, password).unwrap();

    // 4. Verify the data is still there
    let title: String = {
        let mut stmt = unlocked_vault
            .conn
            .prepare("SELECT title FROM note WHERE id = ?1")
            .unwrap();
        stmt.query_row([note_id.to_string()], |row| row.get(0))
            .unwrap()
    };
    assert_eq!(title, "Test Note");
    drop(unlocked_vault);

    // 5. Try to unlock with the wrong password
    let result = unlock_vault(vault_path, "wrong_password");
    assert!(result.is_err());
}
