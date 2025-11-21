use crate::db::DbError;
use chrono::Utc;
use rusqlite::types::{FromSql, FromSqlResult, ValueRef};
use rusqlite::{Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

use std::fmt::{Display, Formatter};
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbUlid(pub Ulid);

impl Display for DbUlid {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromSql for DbUlid {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let s = value.as_str()?;
        Ulid::from_string(s)
            .map(DbUlid)
            .map_err(|e| rusqlite::types::FromSqlError::Other(Box::new(e)))
    }
}

pub fn get_recent_notes(
    conn: &Connection,
    space_id: &str,
    limit: u32,
) -> Result<Vec<Note>, DbError> {
    log::info!(
        "[note] Getting recent notes for space with id: {}",
        space_id
    );
    let mut stmt = conn.prepare("SELECT id, space_id, title, content_md, created_at, modified_at, is_trashed FROM note WHERE space_id = ?1 AND is_trashed = 0 ORDER BY modified_at DESC LIMIT ?2")?;
    let notes = stmt
        .query_map([space_id, &limit.to_string()], |row| {
            Ok(Note {
                id: row.get(0)?,
                space_id: row.get(1)?,
                title: row.get(2)?,
                content_md: row.get(3)?,
                created_at: row.get(4)?,
                modified_at: row.get(5)?,
                is_trashed: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<Note>, _>>()?;
    log::info!("[note] Found {} recent notes", notes.len());
    Ok(notes)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: DbUlid,
    pub space_id: String,
    pub title: String,
    pub content_md: String,
    pub created_at: i64,
    pub modified_at: i64,
    pub is_trashed: bool,
}

pub fn create_note(
    conn: &Connection,
    space_id: &str,
    title: &str,
    content_md: &str,
) -> Result<Note, DbError> {
    log::info!("[note] Creating note with title: {}", title);
    let now = Utc::now().timestamp();
    let note = Note {
        id: DbUlid(Ulid::new()),
        space_id: space_id.to_string(),
        title: title.to_string(),
        content_md: content_md.to_string(),
        created_at: now,
        modified_at: now,
        is_trashed: false,
    };

    conn.execute(
        "INSERT INTO note (id, space_id, title, content_md, created_at, modified_at, is_trashed) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![&note.id.0.to_string(), &note.space_id, &note.title, &note.content_md, &note.created_at, &note.modified_at, note.is_trashed],
    )?;

    conn.execute(
        "INSERT INTO fts_note (note_id, title, content_md) VALUES (?1, ?2, ?3)",
        rusqlite::params![
            &note.id.0.to_string(),
            &note.title.to_lowercase(),
            &note.content_md
        ],
    )?;

    Ok(note)
}

pub fn get_note(conn: &Connection, id: DbUlid) -> Result<Option<Note>, DbError> {
    log::info!("[note] Getting note with id: {}", id.0);
    let mut stmt = conn.prepare("SELECT id, space_id, title, content_md, created_at, modified_at, is_trashed FROM note WHERE id = ?1 ORDER BY modified_at DESC LIMIT 1")?;
    let note: Option<Note> = stmt
        .query_row([id.0.to_string()], |row| {
            Ok(Note {
                id: row.get(0)?,
                space_id: row.get(1)?,
                title: row.get(2)?,
                content_md: row.get(3)?,
                created_at: row.get(4)?,
                modified_at: row.get(5)?,
                is_trashed: row.get(6)?,
            })
        })
        .optional()
        .map_err(|e| {
            log::error!("[note] Error getting note with id: {}, error: {}", id.0, e);
            e
        })?;
    log::info!("[note] Found note: {:?}", note);
    Ok(note)
}

pub fn update_note_content(
    conn: &mut Connection,
    id: DbUlid,
    title: &str,
    content_md: &str,
) -> Result<(), DbError> {
    log::info!("[note] Updating note content for id: {}", id.0);

    let tx = conn.transaction()?;

    // Check if note exists first to return nice error
    let rowid: i64 = tx
        .query_row(
            "SELECT rowid FROM note WHERE id = ?1",
            [id.0.to_string()],
            |row| row.get(0),
        )
        .map_err(|e| {
            log::error!(
                "[note] Error getting rowid for note with id: {}, error: {}",
                id.0,
                e
            );
            match e {
                rusqlite::Error::QueryReturnedNoRows => DbError::Message("Note not found".into()),
                _ => DbError::Rusqlite(e),
            }
        })?;

    tx.execute(
        "UPDATE note SET title = ?1, content_md = ?2, modified_at = ?3 WHERE id = ?4",
        rusqlite::params![title, content_md, Utc::now().timestamp(), id.0.to_string(),],
    )?;

    tx.execute(
        "DELETE FROM fts_note WHERE rowid = ?1",
        rusqlite::params![rowid],
    )?;

    tx.execute(
        "INSERT INTO fts_note(rowid, title, content_md, note_id) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![rowid, title.to_lowercase(), content_md, id.0.to_string()],
    )?;

    tx.commit()?;

    let note = get_note(conn, id.clone())?.ok_or(DbError::Message("Note not found".into()))?;
    handle_note_update(conn, &note.space_id, id, content_md)?;

    Ok(())
}

pub fn trash_note(conn: &Connection, id: DbUlid) -> Result<(), DbError> {
    log::info!("[note] Trashing note with id: {}", id.0);
    conn.execute(
        "UPDATE note SET is_trashed = 1 WHERE id = ?1",
        [id.0.to_string()],
    )?;
    Ok(())
}

use crate::meeting::extract_action_items;
use crate::mode::get_space_modes;

pub fn restore_note(conn: &Connection, id: DbUlid) -> Result<(), DbError> {
    log::info!("[note] Restoring note with id: {}", id.0);
    conn.execute(
        "UPDATE note SET is_trashed = 0 WHERE id = ?1",
        [id.0.to_string()],
    )?;
    Ok(())
}

fn handle_note_update(
    conn: &Connection,
    space_id: &str,
    note_id: DbUlid,
    content_md: &str,
) -> Result<(), DbError> {
    let modes = get_space_modes(conn, space_id)?;
    if modes.iter().any(|m| m.id == "meeting-notes") {
        extract_action_items(conn, space_id, &note_id.0.to_string(), content_md)
            .map_err(|e| DbError::Message(e.to_string()))?;
    }
    Ok(())
}

pub fn get_all_notes_in_space(conn: &Connection, space_id: &str) -> Result<Vec<Note>, DbError> {
    log::info!("[note] Getting all notes for space with id: {}", space_id);
    let mut stmt = conn.prepare("SELECT id, space_id, title, content_md, created_at, modified_at, is_trashed FROM note WHERE space_id = ?1 AND is_trashed = 0")?;
    let notes = stmt
        .query_map([space_id], |row| {
            Ok(Note {
                id: row.get(0)?,
                space_id: row.get(1)?,
                title: row.get(2)?,
                content_md: row.get(3)?,
                created_at: row.get(4)?,
                modified_at: row.get(5)?,
                is_trashed: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<Note>, _>>()?;
    log::info!("[note] Found {} notes", notes.len());
    Ok(notes)
}

pub fn get_or_create_daily_note(conn: &Connection, space_id: &str) -> Result<Note, DbError> {
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let title = format!("Daily Note - {}", today);

    let mut stmt = conn.prepare("SELECT id, space_id, title, content_md, created_at, modified_at, is_trashed FROM note WHERE title = ?1 AND space_id = ?2")?;
    let note: Option<Note> = stmt
        .query_row([&title, space_id], |row| {
            Ok(Note {
                id: row.get(0)?,
                space_id: row.get(1)?,
                title: row.get(2)?,
                content_md: row.get(3)?,
                created_at: row.get(4)?,
                modified_at: row.get(5)?,
                is_trashed: row.get(6)?,
            })
        })
        .optional()?;

    if let Some(note) = note {
        Ok(note)
    } else {
        let content = format!(
            "# Daily Note - {}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n",
            today
        );
        create_note(conn, space_id, &title, &content)
    }
}
