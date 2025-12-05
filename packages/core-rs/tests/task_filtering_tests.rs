use core_rs::task::TaskQueryBuilder;
use rusqlite::Connection;

fn setup_db() -> Connection {
    let mut conn = Connection::open_in_memory().unwrap();
    core_rs::db::migrations::migrate(&mut conn).unwrap();
    conn
}

#[test]
fn test_complex_task_filtering() {
    let _conn = setup_db();

    // Verify query builder can handle multiple conditions
    // Note: TaskQueryBuilder.priority takes a string reference in this implementation
    let query = TaskQueryBuilder::new()
        .priority("High")
        .completed(false)
        .build();

    assert!(query.contains("WHERE"));
    assert!(query.contains("priority = ?"));
    assert!(query.contains("is_completed = ?"));
}

#[test]
fn test_task_filtering_edge_cases() {
    // Empty filter
    let query = TaskQueryBuilder::new().build();
    assert!(!query.contains("WHERE"));

    // SQL injection attempt logic verification
    // Since we pass strings for priority, we check if it blindly concats.
    // The build() method returns a static string "priority = ?", so it's safe from injection in structure,
    // assuming the caller binds the parameters correctly.
    let query = TaskQueryBuilder::new()
        .priority("High'; DROP TABLE task; --")
        .build();

    assert!(query.contains("priority = ?"));
    // Ensure the raw input isn't in the SQL string
    assert!(!query.contains("DROP TABLE"));
}
