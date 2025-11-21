use core_rs::dashboard;
use core_rs::db;
use core_rs::space;
use core_rs::task;
use rusqlite::Connection;
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, temp_dir)
}

#[test]
fn test_get_dashboard_stats_empty() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Dashboard Space").unwrap();

    let stats = dashboard::get_dashboard_stats(&conn, &space_id.to_string()).unwrap();

    assert_eq!(stats.health.metrics_count, 0);
    assert!(stats.health.latest_metric.is_none());
    assert_eq!(stats.music.track_count, 0);
    assert_eq!(stats.music.playlist_count, 0);
    assert_eq!(stats.social.posts_count, 0);
    assert_eq!(stats.social.platforms_count, 0);
    assert_eq!(stats.tasks.pending_count, 0);
    assert_eq!(stats.tasks.completed_count, 0);
}

#[test]
fn test_get_dashboard_stats_with_data() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Stats Space").unwrap();
    let space_str = space_id.to_string();

    // 1. Add Task Data
    // Pending tasks
    task::create_task(&conn, space_id, "Pending 1", None).unwrap();
    task::create_task(&conn, space_id, "Pending 2", None).unwrap();
    // Completed task
    let mut done_task = task::create_task(&conn, space_id, "Done 1", None).unwrap();
    done_task.status = "done".to_string();
    task::update_task(&conn, &done_task).unwrap();

    // 2. Add Health Data
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO health_metric (id, space_id, metric_type, value, unit, recorded_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![Ulid::new().to_string(), space_str, "weight", 70.0, "kg", now, now, now],
    ).unwrap();

    // 3. Add Music Data
    conn.execute(
        "INSERT INTO track (id, space_id, title, added_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![Ulid::new().to_string(), space_str, "Song 1", 100, 100],
    ).unwrap();
    conn.execute(
        "INSERT INTO playlist (id, space_id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![Ulid::new().to_string(), space_str, "Playlist 1", 100, 100],
    ).unwrap();

    // 4. Add Social Data
    let account_id = Ulid::new().to_string();
    // Fixed: Removed added_at/updated_at if they don't exist in schema or use correct ones
    // Checking db.rs migration v6: created_at, last_sync, sync_frequency_minutes
    // It does NOT have added_at or updated_at for social_account.
    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, created_at, encrypted_credentials) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![account_id, space_str, "twitter", "user", 100, "fake_creds"],
    ).unwrap();

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, author, content, timestamp, fetched_at, raw_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![Ulid::new().to_string(), account_id, "twitter", "user", "Post", 100, 100, "{}"],
    ).unwrap();

    // Verify
    let stats = dashboard::get_dashboard_stats(&conn, &space_str).unwrap();

    assert_eq!(stats.tasks.pending_count, 2);
    assert_eq!(stats.tasks.completed_count, 1);
    assert_eq!(stats.health.metrics_count, 1);
    assert_eq!(stats.health.latest_metric, Some("weight".to_string()));
    assert_eq!(stats.music.track_count, 1);
    assert_eq!(stats.music.playlist_count, 1);
    assert_eq!(stats.social.posts_count, 1);
    assert_eq!(stats.social.platforms_count, 1);
}
