use core_rs::db;
use core_rs::project;
use core_rs::space;
use core_rs::task;
use rusqlite::Connection;
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    conn.execute("PRAGMA foreign_keys = ON", []).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, dir)
}

#[test]
fn test_project_dependency_cycle_robustness() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Engineering").unwrap();

    let p1 = project::create_project(&conn, &space_id.to_string(), "Project Alpha").unwrap();
    let p2 = project::create_project(&conn, &space_id.to_string(), "Project Beta").unwrap();
    let p3 = project::create_project(&conn, &space_id.to_string(), "Project Gamma").unwrap();

    project::create_project_dependency(&conn, &p1.id, &p2.id).unwrap();
    project::create_project_dependency(&conn, &p2.id, &p3.id).unwrap();

    let deps = project::get_project_dependencies(&conn, &p1.id).unwrap();
    assert_eq!(deps.len(), 1);
    assert_eq!(deps[0].depends_on_project_id, p2.id);

    let cycle_res = project::create_project_dependency(&conn, &p3.id, &p1.id);
    assert!(cycle_res.is_ok());
}

#[test]
fn test_project_cascade_delete_robustness() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Ops").unwrap();
    let p1 = project::create_project(&conn, &space_id.to_string(), "Project Delta").unwrap();

    project::create_project_milestone(&conn, &p1.id, "M1", None, "active").unwrap();
    project::create_project_risk(&conn, &p1.id, "Risk 1", "High", "High", "None", None).unwrap();

    let mut task = task::create_task(&conn, space_id, "Task 1", None).unwrap();

    task.project_id = Some(Ulid::from_string(&p1.id).unwrap());
    task::update_task(&conn, &task).unwrap();

    let tasks = task::get_tasks_by_project(&conn, Ulid::from_string(&p1.id).unwrap()).unwrap();
    assert_eq!(tasks.len(), 1);

    // delete_project now requires &mut Connection
    project::delete_project(&mut conn, &p1.id).unwrap();

    // Verify project is gone
    let proj_check = project::get_project(&conn, &p1.id).unwrap();
    assert!(proj_check.is_none());

    // Verify milestones are gone (manual delete in delete_project)
    // We can check row count directly
    let count: i64 = conn.query_row("SELECT count(*) FROM project_milestone WHERE project_id = ?1", [&p1.id], |r| r.get(0)).unwrap();
    assert_eq!(count, 0);

    // Verify tasks are unlinked (project_id set to NULL)
    let task_check = task::get_task(&conn, task.id).unwrap().unwrap();
    assert!(task_check.project_id.is_none());
}
