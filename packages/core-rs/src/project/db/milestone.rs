use crate::project::models::*;
use rusqlite::{Connection, OptionalExtension, Result};
use ulid::Ulid;

pub fn create_project_milestone(
    conn: &Connection,
    project_id: &str,
    title: &str,
    due_at: Option<i64>,
    status: &str,
) -> Result<ProjectMilestone, ProjectError> {
    log::info!(
        "[project] Creating milestone '{}' for project {}",
        title,
        project_id
    );
    let id = Ulid::new().to_string();
    match conn.execute(
        "INSERT INTO project_milestone (id, project_id, title, due_at, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, project_id, title, due_at, status],
    ) {
        Ok(_) => {
            log::debug!("[project] Milestone created successfully with id: {}", id);
            Ok(ProjectMilestone {
                id,
                project_id: project_id.to_string(),
                title: title.to_string(),
                due_at,
                status: status.to_string(),
            })
        }
        Err(e) => {
            log::error!("[project] Error creating milestone: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_project_milestone(
    conn: &Connection,
    id: &str,
) -> Result<Option<ProjectMilestone>, ProjectError> {
    log::info!("[project] Getting milestone with id: {}", id);
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, due_at, status FROM project_milestone WHERE id = ?1",
    )?;
    match stmt
        .query_row([id], |row| {
            Ok(ProjectMilestone {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                due_at: row.get(3)?,
                status: row.get(4)?,
            })
        })
        .optional()
    {
        Ok(milestone) => {
            log::debug!("[project] Found milestone with id: {}", id);
            Ok(milestone)
        }
        Err(e) => {
            log::error!("[project] Error getting milestone: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_project_milestones(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectMilestone>, ProjectError> {
    log::info!("[project] Getting milestones for project: {}", project_id);
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, due_at, status FROM project_milestone WHERE project_id = ?1",
    )?;
    let result = stmt
        .query_map([project_id], |row| {
            Ok(ProjectMilestone {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                due_at: row.get(3)?,
                status: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<ProjectMilestone>, _>>();
    match result {
        Ok(milestones) => {
            log::debug!(
                "[project] Found {} milestones for project {}",
                milestones.len(),
                project_id
            );
            Ok(milestones)
        }
        Err(e) => {
            log::error!("[project] Error getting milestones: {}", e);
            Err(e.into())
        }
    }
}

pub fn update_project_milestone(
    conn: &Connection,
    id: &str,
    title: &str,
    due_at: Option<i64>,
    status: &str,
) -> Result<(), ProjectError> {
    log::info!("[project] Updating milestone with id: {}", id);
    match conn.execute(
        "UPDATE project_milestone SET title = ?2, due_at = ?3, status = ?4 WHERE id = ?1",
        rusqlite::params![id, title, due_at, status],
    ) {
        Ok(_) => {
            log::debug!("[project] Milestone updated successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error updating milestone: {}", e);
            Err(e.into())
        }
    }
}

pub fn delete_project_milestone(conn: &Connection, id: &str) -> Result<(), ProjectError> {
    log::info!("[project] Deleting milestone with id: {}", id);
    match conn.execute("DELETE FROM project_milestone WHERE id = ?1", [id]) {
        Ok(_) => {
            log::debug!("[project] Milestone deleted successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error deleting milestone: {}", e);
            Err(e.into())
        }
    }
}
