#[cfg(test)]
mod tests {
    use core_rs::db::migrate;
    use core_rs::goals::*;
    use core_rs::habits::*;
    use core_rs::space::*;
    use rusqlite::Connection;

    #[test]
    fn test_goal_lifecycle() {
        let mut conn = Connection::open_in_memory().unwrap();
        // Enable foreign keys to be strict
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();

        migrate(&mut conn).unwrap();

        // Create a space first because Goal references Space
        let space_id = create_space(&mut conn, "Test Space").unwrap();

        // Create
        let goal = create_goal(&conn, space_id, "Test Goal", 100.0, "Test").unwrap();
        assert_eq!(goal.title, "Test Goal");
        assert_eq!(goal.current, 0.0);

        // Update
        let updated = update_goal_progress(&conn, goal.id, 50.0).unwrap();
        assert_eq!(updated.current, 50.0);
        assert!(!updated.is_completed);

        let completed = update_goal_progress(&conn, goal.id, 100.0).unwrap();
        assert!(completed.is_completed);

        // Get
        let goals = get_goals(&conn, space_id).unwrap();
        assert_eq!(goals.len(), 1);

        // Delete
        delete_goal(&conn, goal.id).unwrap();
        let goals = get_goals(&conn, space_id).unwrap();
        assert_eq!(goals.len(), 0);
    }

    #[test]
    fn test_habit_lifecycle() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();

        migrate(&mut conn).unwrap();

        // Create a space first
        let space_id = create_space(&mut conn, "Test Space").unwrap();

        // Create
        let habit = create_habit(&conn, space_id, "Test Habit", "daily").unwrap();
        assert_eq!(habit.name, "Test Habit");
        assert_eq!(habit.streak, 0);

        // Complete
        let updated = complete_habit(&conn, habit.id).unwrap();
        assert_eq!(updated.streak, 1);
        assert_eq!(updated.longest_streak, 1);

        // Get
        let habits = get_habits(&conn, space_id).unwrap();
        assert_eq!(habits.len(), 1);

        // Delete
        delete_habit(&conn, habit.id).unwrap();
        let habits = get_habits(&conn, space_id).unwrap();
        assert_eq!(habits.len(), 0);
    }
}
