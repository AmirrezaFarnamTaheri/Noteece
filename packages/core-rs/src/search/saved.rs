use crate::db::DbError;
use rusqlite::{Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedSearch {
    pub id: String,
    pub space_id: Option<String>,
    pub name: String,
    pub query: String,
}

pub fn create_saved_search(
    conn: &Connection,
    name: &str,
    query: &str,
    space_id: Option<&str>,
) -> Result<SavedSearch, DbError> {
    let id = Ulid::new().to_string();
    conn.execute(
        "INSERT INTO saved_search (id, space_id, title, query_string, scope) VALUES (?1, ?2, ?3, ?4, 'note')",
        rusqlite::params![id, space_id, name, query],
    )?;
    Ok(SavedSearch {
        id,
        space_id: space_id.map(|s| s.to_string()),
        name: name.to_string(),
        query: query.to_string(),
    })
}

pub fn get_saved_search(conn: &Connection, id: Ulid) -> Result<Option<SavedSearch>, DbError> {
    let mut stmt =
        conn.prepare("SELECT id, space_id, title, query_string FROM saved_search WHERE id = ?1")?;
    let result = stmt
        .query_row([id.to_string()], |row| {
            Ok(SavedSearch {
                id: row.get(0)?,
                space_id: row.get(1)?,
                name: row.get(2)?,
                query: row.get(3)?,
            })
        })
        .optional()?;
    Ok(result)
}

pub fn get_saved_searches(
    conn: &Connection,
    space_id: Option<&str>,
) -> Result<Vec<SavedSearch>, DbError> {
    let mut sql = "SELECT id, space_id, title, query_string FROM saved_search".to_string();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(sid) = space_id {
        sql.push_str(" WHERE space_id = ?1");
        params.push(Box::new(sid.to_string()));
    }

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(SavedSearch {
            id: row.get(0)?,
            space_id: row.get(1)?,
            name: row.get(2)?,
            query: row.get(3)?,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn update_saved_search(
    conn: &Connection,
    id: Ulid,
    name: &str,
    query: &str,
) -> Result<SavedSearch, DbError> {
    conn.execute(
        "UPDATE saved_search SET title = ?1, query_string = ?2 WHERE id = ?3",
        rusqlite::params![name, query, id.to_string()],
    )?;
    // Fetch updated
    get_saved_search(conn, id)?.ok_or(DbError::Message(
        "Saved search not found after update".to_string(),
    ))
}

pub fn delete_saved_search(conn: &Connection, id: Ulid) -> Result<(), DbError> {
    conn.execute("DELETE FROM saved_search WHERE id = ?1", [id.to_string()])?;
    Ok(())
}
