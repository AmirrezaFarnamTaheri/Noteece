use crate::project::models::*;
use rusqlite::{Connection, OptionalExtension, Result};
use ulid::Ulid;

pub fn create_project_update(
    conn: &Connection,
    project_id: &str,
    when_at: i64,
    health: &str,
    summary: &str,
) -> Result<ProjectUpdate, ProjectError> {
    log::info!("[project] Creating update for project {}", project_id);
    let id = Ulid::new().to_string();
    match conn.execute(
        "INSERT INTO project_update (id, project_id, when_at, health, summary) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, project_id, when_at, health, summary],
    ) {
        Ok(_) => {
            log::debug!("[project] Update created successfully with id: {}", id);
            Ok(ProjectUpdate {
                id,
                project_id: project_id.to_string(),
                when_at,
                health: health.to_string(),
                summary: summary.to_string(),
            })
        }
        Err(e) => {
            log::error!("[project] Error creating update: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_project_update(
    conn: &Connection,
    id: &str,
) -> Result<Option<ProjectUpdate>, ProjectError> {
    log::info!("[project] Getting update with id: {}", id);
    let mut stmt = conn.prepare(
        "SELECT id, project_id, when_at, health, summary FROM project_update WHERE id = ?1",
    )?;
    match stmt
        .query_row([id], |row| {
            Ok(ProjectUpdate {
                id: row.get(0)?,
                project_id: row.get(1)?,
                when_at: row.get(2)?,
                health: row.get(3)?,
                summary: row.get(4)?,
            })
        })
        .optional()
    {
        Ok(update) => {
            log::debug!("[project] Found update with id: {}", id);
            Ok(update)
        }
        Err(e) => {
            log::error!("[project] Error getting update: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_project_updates(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectUpdate>, ProjectError> {
    log::info!("[project] Getting updates for project: {}", project_id);
    let mut stmt = conn.prepare(
        "SELECT id, project_id, when_at, health, summary FROM project_update WHERE project_id = ?1",
    )?;
    let result = stmt
        .query_map([project_id], |row| {
            Ok(ProjectUpdate {
                id: row.get(0)?,
                project_id: row.get(1)?,
                when_at: row.get(2)?,
                health: row.get(3)?,
                summary: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<ProjectUpdate>, _>>();
    match result {
        Ok(updates) => {
            log::debug!(
                "[project] Found {} updates for project {}",
                updates.len(),
                project_id
            );
            Ok(updates)
        }
        Err(e) => {
            log::error!("[project] Error getting updates: {}", e);
            Err(e.into())
        }
    }
}

pub fn update_project_update(
    conn: &Connection,
    id: &str,
    when_at: i64,
    health: &str,
    summary: &str,
) -> Result<(), ProjectError> {
    log::info!("[project] Updating update with id: {}", id);
    match conn.execute(
        "UPDATE project_update SET when_at = ?2, health = ?3, summary = ?4 WHERE id = ?1",
        rusqlite::params![id, when_at, health, summary],
    ) {
        Ok(_) => {
            log::debug!("[project] Update updated successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error updating update: {}", e);
            Err(e.into())
        }
    }
}

pub fn delete_project_update(conn: &Connection, id: &str) -> Result<(), ProjectError> {
    log::info!("[project] Deleting update with id: {}", id);
    match conn.execute("DELETE FROM project_update WHERE id = ?1", [id]) {
        Ok(_) => {
            log::debug!("[project] Update deleted successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error deleting update: {}", e);
            Err(e.into())
        }
    }
}
