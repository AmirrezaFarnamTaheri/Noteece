use rusqlite::Result;
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: Ulid,
    pub space_id: Ulid,
    pub note_id: Option<Ulid>,
    pub project_id: Option<Ulid>,
    pub parent_task_id: Option<Ulid>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub due_at: Option<i64>,
    pub start_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub priority: Option<i64>,
    pub estimate_minutes: Option<i64>,
    pub recur_rule: Option<String>,
    pub context: Option<String>,
    pub area: Option<String>,
    pub updated_at: i64,
}

impl TryFrom<&rusqlite::Row<'_>> for Task {
    type Error = rusqlite::Error;

    fn try_from(row: &rusqlite::Row<'_>) -> Result<Self, Self::Error> {
        Ok(Task {
            id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            note_id: row
                .get::<_, Option<String>>(2)?
                .map(|s| Ulid::from_string(&s))
                .transpose()
                .map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        2,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?,
            project_id: row
                .get::<_, Option<String>>(3)?
                .map(|s| Ulid::from_string(&s))
                .transpose()
                .map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        3,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?,
            parent_task_id: row
                .get::<_, Option<String>>(4)?
                .map(|s| Ulid::from_string(&s))
                .transpose()
                .map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        4,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?,
            title: row.get(5)?,
            description: row.get(6)?,
            status: row.get(7)?,
            due_at: row.get(8)?,
            start_at: row.get(9)?,
            completed_at: row.get(10)?,
            priority: row.get(11)?,
            estimate_minutes: row.get(12)?,
            recur_rule: row.get(13)?,
            context: row.get(14)?,
            area: row.get(15)?,
            updated_at: row.get(16)?,
        })
    }
}
