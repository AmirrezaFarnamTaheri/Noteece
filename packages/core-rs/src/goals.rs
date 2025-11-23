use crate::db::DbError;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Goal {
    pub id: Ulid,
    pub space_id: Ulid,
    pub title: String,
    pub description: Option<String>,
    pub target: f64,
    pub current: f64,
    pub unit: String,
    pub category: String,
    pub start_date: i64,
    pub target_date: Option<i64>,
    pub is_completed: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn create_goal(
    conn: &Connection,
    space_id: Ulid,
    title: &str,
    target: f64,
    category: &str,
) -> Result<Goal, DbError> {
    let now = chrono::Utc::now().timestamp();
    let goal = Goal {
        id: Ulid::new(),
        space_id,
        title: title.to_string(),
        description: None,
        target,
        current: 0.0,
        unit: "count".to_string(),
        category: category.to_string(),
        start_date: now,
        target_date: None,
        is_completed: false,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO goal (
            id, space_id, title, description, target, current, unit, category,
            start_date, target_date, is_completed, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![
            &goal.id.to_string(),
            &goal.space_id.to_string(),
            &goal.title,
            &goal.description,
            &goal.target,
            &goal.current,
            &goal.unit,
            &goal.category,
            &goal.start_date,
            &goal.target_date,
            &goal.is_completed,
            &goal.created_at,
            &goal.updated_at
        ],
    )?;

    Ok(goal)
}

pub fn get_goals(conn: &Connection, space_id: Ulid) -> Result<Vec<Goal>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, title, description, target, current, unit, category,
                start_date, target_date, is_completed, created_at, updated_at
         FROM goal
         WHERE space_id = ?1
         ORDER BY created_at DESC",
    )?;

    let goals = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(Goal {
                id: Ulid::from_string(&row.get::<_, String>(0)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                title: row.get(2)?,
                description: row.get(3)?,
                target: row.get(4)?,
                current: row.get(5)?,
                unit: row.get(6)?,
                category: row.get(7)?,
                start_date: row.get(8)?,
                target_date: row.get(9)?,
                is_completed: row.get::<_, i32>(10)? != 0,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(goals)
}

pub fn update_goal_progress(
    conn: &Connection,
    goal_id: Ulid,
    current: f64,
) -> Result<Goal, DbError> {
    let now = chrono::Utc::now().timestamp();

    // Get current target to check completion
    let target: f64 = conn.query_row(
        "SELECT target FROM goal WHERE id = ?1",
        [&goal_id.to_string()],
        |row| row.get(0),
    )?;

    let is_completed = current >= target;

    conn.execute(
        "UPDATE goal SET current = ?1, is_completed = ?2, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![current, is_completed, now, &goal_id.to_string()],
    )?;

    // Return updated goal
    conn.query_row(
        "SELECT id, space_id, title, description, target, current, unit, category,
                start_date, target_date, is_completed, created_at, updated_at
         FROM goal WHERE id = ?1",
        [&goal_id.to_string()],
        |row| {
            Ok(Goal {
                id: Ulid::from_string(&row.get::<_, String>(0)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                title: row.get(2)?,
                description: row.get(3)?,
                target: row.get(4)?,
                current: row.get(5)?,
                unit: row.get(6)?,
                category: row.get(7)?,
                start_date: row.get(8)?,
                target_date: row.get(9)?,
                is_completed: row.get::<_, i32>(10)? != 0,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
    .map_err(|e| e.into())
}

pub fn delete_goal(conn: &Connection, goal_id: Ulid) -> Result<(), DbError> {
    conn.execute("DELETE FROM goal WHERE id = ?1", [&goal_id.to_string()])?;
    Ok(())
}
