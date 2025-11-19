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

    // Corrected list of tables based on the current schema
    assert_eq!(
        tables,
        vec![
            "finance_account",
            "form_template",
            "fts_note",
            "fts_note_config",
            "fts_note_content",
            "fts_note_data",
            "fts_note_docsize",
            "fts_note_idx",
            "health_goal",
            "health_metric",
            "insight",
            "insight_feedback",
            "itinerary_item",
            "knowledge_card",
            "link",
            "meal_plan",
            "note",
            "note_meta",
            "note_tags",
            "person",
            "project",
            "project_dependency",
            "project_milestone",
            "project_risk",
            "project_update",
            "recipe",
            "recipe_ingredient",
            "review_log",
            "role_permissions",
            "roles",
            "saved_search",
            "schema_version",
            "sessions",
            "settings",
            "space",
            "space_user_roles",
            "space_users",
            "tag",
            "task",
            "task_people",
            "task_recur_exdate",
            "task_tags",
            "time_entry",
            "transaction",
            "travel_document",
            "trip",
            "user_invitations",
            "user_permissions",
            "users"
        ]
    );

    Ok(())
}

#[test]
fn test_foreign_key_constraint() {
    let (_dir, mut conn) = setup_db();
    migrate(&mut conn).unwrap();

    let result = conn.execute("INSERT INTO note (id, space_id, title, content_md, created_at, modified_at) VALUES ('note1', 'space1', 'title', 'content', 0, 0)", []);
    assert!(result.is_err());
}
