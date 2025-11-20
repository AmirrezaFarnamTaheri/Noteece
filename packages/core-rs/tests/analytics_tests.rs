use core_rs::analytics::*;
use rusqlite::Connection;

fn setup_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();

    // Mock schemas required by analytics
    conn.execute(
        "CREATE TABLE note (id TEXT, created_at INTEGER, content_md TEXT, is_trashed BOOLEAN)",
        [],
    )
    .unwrap();
    conn.execute("CREATE TABLE task (id TEXT, completed_at INTEGER)", [])
        .unwrap();
    conn.execute("CREATE TABLE project (id TEXT)", []).unwrap();

    conn
}

#[test]
fn test_get_analytics_data_empty() {
    let conn = setup_db();
    let data = get_analytics_data(&conn).unwrap();

    assert_eq!(data.note_count, 0);
    assert_eq!(data.task_count, 0);
    assert_eq!(data.project_count, 0);
    assert!(data.tasks_completed_by_week.is_empty());
}

#[test]
fn test_get_analytics_counts() {
    let conn = setup_db();

    // Insert mock data
    conn.execute("INSERT INTO note (id) VALUES ('1'), ('2')", [])
        .unwrap();
    conn.execute("INSERT INTO task (id) VALUES ('1'), ('2'), ('3')", [])
        .unwrap();
    conn.execute("INSERT INTO project (id) VALUES ('1')", [])
        .unwrap();

    let data = get_analytics_data(&conn).unwrap();

    assert_eq!(data.note_count, 2);
    assert_eq!(data.task_count, 3);
    assert_eq!(data.project_count, 1);
}

#[test]
fn test_weekly_stats_aggregation() {
    let conn = setup_db();
    let now = chrono::Utc::now().timestamp();

    // Complete a task now
    conn.execute(
        "INSERT INTO task (id, completed_at) VALUES ('1', ?1)",
        [now],
    )
    .unwrap();

    let data = get_analytics_data(&conn).unwrap();

    assert!(!data.tasks_completed_by_week.is_empty());
    assert_eq!(data.tasks_completed_by_week[0].count, 1);
}
