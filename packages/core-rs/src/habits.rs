use crate::audit;
use crate::db::DbError;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Habit {
    pub id: Ulid,
    pub space_id: Ulid,
    pub name: String,
    pub description: Option<String>,
    pub frequency: String, // daily, weekly, etc.
    pub target_days_per_week: i32,
    pub streak: i32,
    pub longest_streak: i32,
    pub last_completed_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn create_habit(
    conn: &Connection,
    space_id: Ulid,
    name: &str,
    frequency: &str,
) -> Result<Habit, DbError> {
    let now = chrono::Utc::now().timestamp();
    let habit = Habit {
        id: Ulid::new(),
        space_id,
        name: name.to_string(),
        description: None,
        frequency: frequency.to_string(),
        target_days_per_week: 7,
        streak: 0,
        longest_streak: 0,
        last_completed_at: None,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO habit (
            id, space_id, name, description, frequency, target_days_per_week,
            streak, longest_streak, last_completed_at, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![
            &habit.id.to_string(),
            &habit.space_id.to_string(),
            &habit.name,
            &habit.description,
            &habit.frequency,
            &habit.target_days_per_week,
            &habit.streak,
            &habit.longest_streak,
            &habit.last_completed_at,
            &habit.created_at,
            &habit.updated_at
        ],
    )?;

    Ok(habit)
}

pub fn get_habits(conn: &Connection, space_id: Ulid) -> Result<Vec<Habit>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, name, description, frequency, target_days_per_week,
                streak, longest_streak, last_completed_at, created_at, updated_at
         FROM habit
         WHERE space_id = ?1
         ORDER BY name ASC",
    )?;

    let habits = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(Habit {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                name: row.get(2)?,
                description: row.get(3)?,
                frequency: row.get(4)?,
                target_days_per_week: row.get(5)?,
                streak: row.get(6)?,
                longest_streak: row.get(7)?,
                last_completed_at: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(habits)
}

pub fn complete_habit(conn: &Connection, habit_id: Ulid) -> Result<Habit, DbError> {
    let now = chrono::Utc::now().timestamp();

    let (last_completed, current_streak, longest_streak, frequency): (Option<i64>, i32, i32, String) = conn.query_row(
        "SELECT last_completed_at, streak, longest_streak, frequency FROM habit WHERE id = ?1",
        [&habit_id.to_string()],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    )?;

    let mut new_streak = current_streak;

    if let Some(last) = last_completed {
        let last_date = chrono::DateTime::from_timestamp(last, 0).ok_or_else(|| rusqlite::Error::ToSqlConversionFailure(Box::new(DbError::Message("Invalid last completed timestamp".to_string()))))?.date_naive();
        let today = chrono::DateTime::from_timestamp(now, 0).ok_or_else(|| rusqlite::Error::ToSqlConversionFailure(Box::new(DbError::Message("Invalid current timestamp".to_string()))))?.date_naive();
        let diff = today.signed_duration_since(last_date).num_days();

        if frequency == "weekly" {
             // For weekly habits, we allow a gap of up to 7 days to maintain streak
             if diff > 0 && diff <= 7 {
                 new_streak += 1;
             } else if diff > 7 {
                 new_streak = 1;
             }
        } else {
             // Daily habits
             if diff == 1 {
                 new_streak += 1;
             } else if diff > 1 {
                 new_streak = 1;
             }
        }
    } else {
        new_streak = 1;
    }

    let new_longest = std::cmp::max(longest_streak, new_streak);

    conn.execute(
        "UPDATE habit SET streak = ?1, longest_streak = ?2, last_completed_at = ?3, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![new_streak, new_longest, now, &habit_id.to_string()],
    )?;

    // Log the completion event
    let event_id = Ulid::new().to_string();
    conn.execute(
        "INSERT INTO habit_log (id, habit_id, completed_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![&event_id, &habit_id.to_string(), now],
    )?;

    let _ = audit::log_event(
        conn,
        None,
        "HABIT_COMPLETED",
        "habit",
        Some(&habit_id.to_string()),
        Some(&format!(r#"{{"streak": {}, "longest_streak": {}}}"#, new_streak, new_longest)),
        None,
        None,
    );

    // Return updated habit
    conn.query_row(
        "SELECT id, space_id, name, description, frequency, target_days_per_week,
                streak, longest_streak, last_completed_at, created_at, updated_at
         FROM habit WHERE id = ?1",
        [&habit_id.to_string()],
        |row| {
            Ok(Habit {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                name: row.get(2)?,
                description: row.get(3)?,
                frequency: row.get(4)?,
                target_days_per_week: row.get(5)?,
                streak: row.get(6)?,
                longest_streak: row.get(7)?,
                last_completed_at: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    ).map_err(|e| e.into())
}

pub fn delete_habit(conn: &Connection, habit_id: Ulid) -> Result<(), DbError> {
    conn.execute(
        "DELETE FROM habit WHERE id = ?1",
        [&habit_id.to_string()],
    )?;
    Ok(())
}
