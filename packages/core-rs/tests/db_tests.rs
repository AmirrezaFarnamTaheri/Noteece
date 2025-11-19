use core_rs::db::{migrate, DbError};
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (tempfile::TempDir, Connection) {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.db");
    let conn = Connection::open(&file_path).unwrap();
    conn.pragma_update(None, "foreign_keys", &"ON").unwrap();
    (dir, conn)
}

#[test]
fn test_migrations() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();
    migrate(&mut conn)?;

    let mut stmt =
        conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")?;
    let tables = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<String>, _>>()?;

    // This is the final, correct list of tables based on the migrate() function.
    assert_eq!(
        tables,
        vec![
            "form_template",
            "fts_note",
            "fts_note_config",
            "fts_note_content",
            "fts_note_data",
            "fts_note_docsize",
            "fts_note_idx",
            "knowledge_card",
            "link",
            "note",
            "note_meta",
            "note_tags",
            "person",
            "project",
            "project_dependency",
            "project_milestone",
            "project_risk",
            "project_update",
            "review_log",
            "saved_search",
            "schema_version",
            "sessions",
            "settings",
            "social_account",
            "social_auto_rule",
            "social_automation_rule",
            "social_category",
            "social_focus_mode",
            "social_post",
            "social_post_category",
            "social_post_fts",
            "social_post_fts_config",
            "social_post_fts_content",
            "social_post_fts_data",
            "social_post_fts_docsize",
            "social_post_fts_idx",
            "social_sync_history",
            "social_webview_session",
            "space",
            "space_people",
            "tag",
            "task",
            "task_people",
            "task_recur_exdate",
            "task_tags",
            "time_entry",
            "users"
        ]
    );

    Ok(())
}

#[test]
fn test_foreign_key_constraint() {
    let (_dir, mut conn) = setup_db();
    migrate(&mut conn).unwrap();

    // This should fail because the space 'space1' does not exist.
    let result = conn.execute("INSERT INTO note (id, space_id, title, content_md, created_at, modified_at) VALUES ('note1', 'space1', 'title', 'content', 0, 0)", []);
    assert!(result.is_err());
}
