use crate::project::models::*;
use rusqlite::{Connection, OptionalExtension, Result};
use ulid::Ulid;

pub fn create_project_risk(
    conn: &Connection,
    project_id: &str,
    description: &str,
    impact: &str,
    likelihood: &str,
    mitigation: &str,
    owner_person_id: Option<&str>,
) -> Result<ProjectRisk, ProjectError> {
    log::info!(
        "[project] Creating risk '{}' for project {}",
        description,
        project_id
    );
    let id = Ulid::new().to_string();
    match conn.execute(
        "INSERT INTO project_risk (id, project_id, description, impact, likelihood, mitigation, owner_person_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, project_id, description, impact, likelihood, mitigation, owner_person_id],
    ) {
        Ok(_) => {
            log::debug!("[project] Risk created successfully with id: {}", id);
            Ok(ProjectRisk {
                id,
                project_id: project_id.to_string(),
                description: description.to_string(),
                impact: impact.to_string(),
                likelihood: likelihood.to_string(),
                mitigation: mitigation.to_string(),
                owner_person_id: owner_person_id.map(|s| s.to_string()),
            })
        }
        Err(e) => {
            log::error!("[project] Error creating risk: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_project_risk(conn: &Connection, id: &str) -> Result<Option<ProjectRisk>, ProjectError> {
    log::info!("[project] Getting risk with id: {}", id);
    let mut stmt = conn.prepare("SELECT id, project_id, description, impact, likelihood, mitigation, owner_person_id FROM project_risk WHERE id = ?1")?;
    match stmt
        .query_row([id], |row| {
            Ok(ProjectRisk {
                id: row.get(0)?,
                project_id: row.get(1)?,
                description: row.get(2)?,
                impact: row.get(3)?,
                likelihood: row.get(4)?,
                mitigation: row.get(5)?,
                owner_person_id: row.get(6)?,
            })
        })
        .optional()
    {
        Ok(risk) => {
            log::debug!("[project] Found risk with id: {}", id);
            Ok(risk)
        }
        Err(e) => {
            log::error!("[project] Error getting risk: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_project_risks(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectRisk>, ProjectError> {
    log::info!("[project] Getting risks for project: {}", project_id);
    let mut stmt = conn.prepare("SELECT id, project_id, description, impact, likelihood, mitigation, owner_person_id FROM project_risk WHERE project_id = ?1")?;
    let result = stmt
        .query_map([project_id], |row| {
            Ok(ProjectRisk {
                id: row.get(0)?,
                project_id: row.get(1)?,
                description: row.get(2)?,
                impact: row.get(3)?,
                likelihood: row.get(4)?,
                mitigation: row.get(5)?,
                owner_person_id: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<ProjectRisk>, _>>();
    match result {
        Ok(risks) => {
            log::debug!(
                "[project] Found {} risks for project {}",
                risks.len(),
                project_id
            );
            Ok(risks)
        }
        Err(e) => {
            log::error!("[project] Error getting risks: {}", e);
            Err(e.into())
        }
    }
}

pub fn update_project_risk(
    conn: &Connection,
    id: &str,
    description: &str,
    impact: &str,
    likelihood: &str,
    mitigation: &str,
    owner_person_id: Option<&str>,
) -> Result<(), ProjectError> {
    log::info!("[project] Updating risk with id: {}", id);
    match conn.execute(
        "UPDATE project_risk SET description = ?2, impact = ?3, likelihood = ?4, mitigation = ?5, owner_person_id = ?6 WHERE id = ?1",
        rusqlite::params![id, description, impact, likelihood, mitigation, owner_person_id],
    ) {
        Ok(_) => {
            log::debug!("[project] Risk updated successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error updating risk: {}", e);
            Err(e.into())
        }
    }
}

pub fn delete_project_risk(conn: &Connection, id: &str) -> Result<(), ProjectError> {
    log::info!("[project] Deleting risk with id: {}", id);
    match conn.execute("DELETE FROM project_risk WHERE id = ?1", [id]) {
        Ok(_) => {
            log::debug!("[project] Risk deleted successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error deleting risk: {}", e);
            Err(e.into())
        }
    }
}
