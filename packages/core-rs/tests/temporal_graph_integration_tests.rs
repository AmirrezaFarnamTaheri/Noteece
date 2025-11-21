use core_rs::db;
use core_rs::note;
use core_rs::space;
use core_rs::temporal_graph;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    // Ensure graph tables are initialized
    temporal_graph::init_temporal_graph_tables(&conn).unwrap();
    (conn, temp_dir)
}

#[test]
fn test_build_current_graph() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Graph Space").unwrap();
    let space_str = space_id.to_string();

    // Create some nodes (Notes)
    let note1 = note::create_note(&conn, &space_str, "Note 1", "Content 1 [[link]]").unwrap();
    let note2 = note::create_note(&conn, &space_str, "Note 2", "Content 2").unwrap();

    // Build graph
    let snapshot = temporal_graph::build_current_graph(&conn, space_id).unwrap();

    // Verify nodes
    assert!(snapshot.nodes.len() >= 2);
    let node_ids: Vec<String> = snapshot.nodes.iter().map(|n| n.id.clone()).collect();
    assert!(node_ids.contains(&note1.id.to_string()));
    assert!(node_ids.contains(&note2.id.to_string()));

    // Verify Metrics
    assert!(snapshot.metrics.total_nodes >= 2);
}

#[test]
fn test_snapshot_persistence() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "History Space").unwrap();

    let snapshot = temporal_graph::build_current_graph(&conn, space_id).unwrap();

    // Save
    let snap_id = temporal_graph::save_graph_snapshot(&conn, space_id, &snapshot).unwrap();
    assert!(!snap_id.is_empty());

    // Retrieve
    let start = chrono::Utc::now().timestamp() - 1000;
    let end = chrono::Utc::now().timestamp() + 1000;
    let snapshots = temporal_graph::get_graph_snapshots(&conn, space_id, start, end, 10).unwrap();

    assert_eq!(snapshots.len(), 1);
    assert_eq!(snapshots[0].nodes.len(), snapshot.nodes.len());
}

#[test]
fn test_major_note_detection() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Milestone Space").unwrap();
    let space_str = space_id.to_string();

    // Create a massive note > 6000 chars
    let huge_content = "word ".repeat(2000);
    note::create_note(&conn, &space_str, "Big Note", &huge_content).unwrap();

    let milestones = temporal_graph::detect_major_notes(&conn, space_id).unwrap();

    assert_eq!(milestones.len(), 1);
    assert_eq!(milestones[0].milestone_type, "major_note");
}
