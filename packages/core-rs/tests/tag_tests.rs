use core_rs::db;
use core_rs::space;
use core_rs::tag;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, temp_dir)
}

#[test]
fn test_tag_lifecycle() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Tag Space").unwrap();
    let space_str = space_id.to_string();

    // Create
    let tag1 = tag::create_tag(&conn, &space_str, "Urgent", Some("#ff0000")).unwrap();
    let tag2 = tag::create_tag(&conn, &space_str, "Work", None).unwrap();

    assert_eq!(tag1.name, "Urgent");
    assert_eq!(tag1.color, Some("#ff0000".to_string()));
    assert_eq!(tag2.name, "Work");
    assert!(tag2.color.is_none());

    // Get All
    let tags = tag::get_all_tags_in_space(&conn, space_id).unwrap();
    assert_eq!(tags.len(), 2);

    // Verify containment
    let names: Vec<String> = tags.iter().map(|t| t.name.clone()).collect();
    assert!(names.contains(&"Urgent".to_string()));
    assert!(names.contains(&"Work".to_string()));
}
