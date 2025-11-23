use core_rs::db;
use core_rs::habits;
use core_rs::space;
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
fn test_habit_crud_and_logs() {
    let (mut conn, _temp_dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Test Space").unwrap();

    // Create Habit
    let habit = habits::create_habit(&conn, space_id, "Exercise", "daily").unwrap();

    assert_eq!(habit.name, "Exercise");
    assert_eq!(habit.streak, 0);

    // Complete Habit
    let updated_habit = habits::complete_habit(&conn, habit.id).unwrap();
    assert_eq!(updated_habit.streak, 1);
    assert!(updated_habit.last_completed_at.is_some());

    // Delete Habit
    habits::delete_habit(&conn, habit.id).unwrap();
    let habits = habits::get_habits(&conn, space_id).unwrap();
    assert!(habits.is_empty());
}
