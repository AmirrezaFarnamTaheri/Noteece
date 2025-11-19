use core_rs::social::*;
use rusqlite::Connection;

fn setup_db() -> Connection {
    let mut conn = Connection::open_in_memory().unwrap();

    // Setup basic schema
    conn.execute(
        "CREATE TABLE IF NOT EXISTS social_account (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            username TEXT NOT NULL,
            display_name TEXT,
            encrypted_credentials TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            last_sync INTEGER,
            sync_frequency_minutes INTEGER NOT NULL DEFAULT 60,
            created_at INTEGER NOT NULL
        )",
        [],
    )
    .unwrap();

    conn
}

#[test]
fn test_social_account_lifecycle() {
    let conn = setup_db();
    let dek = vec![0u8; 32]; // Mock DEK
    let space_id = "space_1";

    // Test Creation
    let account = add_social_account(
        &conn,
        space_id,
        "twitter",
        "user1",
        Some("User One"),
        "token",
        &dek,
    )
    .unwrap();

    assert_eq!(account.platform, "twitter");
    assert_eq!(account.username, "user1");
    assert_eq!(account.enabled, true);

    // Test Retrieval
    let fetched = get_social_account(&conn, &account.id).unwrap().unwrap();
    assert_eq!(fetched.id, account.id);

    // Test Listing
    let accounts = get_social_accounts(&conn, space_id).unwrap();
    assert_eq!(accounts.len(), 1);

    // Test Credential Decryption
    let creds = get_decrypted_credentials(&conn, &account.id, &dek).unwrap();
    assert_eq!(creds, "token");

    // Test Update
    update_social_account(&conn, &account.id, Some(false), None, None).unwrap();
    let updated = get_social_account(&conn, &account.id).unwrap().unwrap();
    assert_eq!(updated.enabled, false);

    // Test Deletion
    delete_social_account(&conn, &account.id).unwrap();
    let missing = get_social_account(&conn, &account.id).unwrap();
    assert!(missing.is_none());
}
