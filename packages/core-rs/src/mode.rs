use crate::db::DbError;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Clone)]
pub struct Mode {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Space {
    pub id: Ulid,
    pub name: String,
    pub enabled_modes: Vec<Mode>,
}

pub fn get_space_modes(conn: &Connection, space_id: &str) -> Result<Vec<Mode>, DbError> {
    log::info!("[mode] Getting modes for space: {}", space_id);
    let mut stmt = conn.prepare("SELECT enabled_modes_json FROM space WHERE id = ?1")?;
    let mut rows = stmt.query([space_id])?;
    let row = rows
        .next()?
        .ok_or(DbError::Rusqlite(rusqlite::Error::QueryReturnedNoRows))?;
    let enabled_modes_json: String = row.get(0)?;
    let enabled_modes: Vec<Mode> = serde_json::from_str(&enabled_modes_json)
        .map_err(|_| DbError::Message("Could not parse enabled modes".into()))?;
    Ok(enabled_modes)
}

pub(crate) fn enable_core_pack(conn: &Connection, space_id: Ulid) -> Result<(), DbError> {
    log::info!("[mode] Enabling core pack for space: {}", space_id);
    let core_modes = vec![
        Mode {
            id: "general-note".to_string(),
            name: "General Note".to_string(),
        },
        Mode {
            id: "daily-note".to_string(),
            name: "Daily Note".to_string(),
        },
        Mode {
            id: "today-board".to_string(),
            name: "Today Board".to_string(),
        },
        Mode {
            id: "scratchpad".to_string(),
            name: "Scratchpad".to_string(),
        },
    ];
    let core_modes_json = serde_json::to_string(&core_modes)
        .map_err(|_| DbError::Message("Could not serialize core modes".into()))?;
    conn.execute(
        "UPDATE space SET enabled_modes_json = ?1 WHERE id = ?2",
        rusqlite::params![core_modes_json, space_id.to_string()],
    )?;
    Ok(())
}

pub fn enable_mode(conn: &Connection, space_id: &str, mode: &Mode) -> Result<(), DbError> {
    log::info!("[mode] Enabling mode '{}' for space: {}", mode.id, space_id);
    let mut modes = get_space_modes(conn, space_id)?;
    if !modes.contains(mode) {
        modes.push(mode.clone());
    }
    let modes_json = serde_json::to_string(&modes)
        .map_err(|_| DbError::Message("Could not serialize modes".into()))?;
    conn.execute(
        "UPDATE space SET enabled_modes_json = ?1 WHERE id = ?2",
        rusqlite::params![modes_json, space_id],
    )?;
    Ok(())
}

pub fn disable_mode(conn: &Connection, space_id: &str, mode: &Mode) -> Result<(), DbError> {
    log::info!(
        "[mode] Disabling mode '{}' for space: {}",
        mode.id,
        space_id
    );
    let mut modes = get_space_modes(conn, space_id)?;
    modes.retain(|m| m.id != mode.id);
    let modes_json = serde_json::to_string(&modes)
        .map_err(|_| DbError::Message("Could not serialize modes".into()))?;
    conn.execute(
        "UPDATE space SET enabled_modes_json = ?1 WHERE id = ?2",
        rusqlite::params![modes_json, space_id],
    )?;
    Ok(())
}
