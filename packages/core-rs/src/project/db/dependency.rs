use crate::project::models::*;
use rusqlite::{Connection, Result};

pub fn create_project_dependency(
    conn: &Connection,
    project_id: &str,
    depends_on_project_id: &str,
) -> Result<ProjectDependency, ProjectError> {
    log::info!(
        "[project] Creating dependency from {} to {}",
        project_id,
        depends_on_project_id
    );
    match conn.execute(
        "INSERT INTO project_dependency (project_id, depends_on_project_id) VALUES (?1, ?2)",
        rusqlite::params![project_id, depends_on_project_id],
    ) {
        Ok(_) => {
            log::debug!("[project] Dependency created successfully");
            Ok(ProjectDependency {
                project_id: project_id.to_string(),
                depends_on_project_id: depends_on_project_id.to_string(),
            })
        }
        Err(e) => {
            log::error!("[project] Error creating dependency: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_project_dependencies(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectDependency>, ProjectError> {
    log::info!("[project] Getting dependencies for project: {}", project_id);
    let mut stmt = conn.prepare(
        "SELECT project_id, depends_on_project_id FROM project_dependency WHERE project_id = ?1",
    )?;
    let result = stmt
        .query_map([project_id], |row| {
            Ok(ProjectDependency {
                project_id: row.get(0)?,
                depends_on_project_id: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<ProjectDependency>, _>>();
    match result {
        Ok(dependencies) => {
            log::debug!(
                "[project] Found {} dependencies for project {}",
                dependencies.len(),
                project_id
            );
            Ok(dependencies)
        }
        Err(e) => {
            log::error!("[project] Error getting dependencies: {}", e);
            Err(e.into())
        }
    }
}

pub fn delete_project_dependency(
    conn: &Connection,
    project_id: &str,
    depends_on_project_id: &str,
) -> Result<(), ProjectError> {
    log::info!(
        "[project] Deleting dependency from {} to {}",
        project_id,
        depends_on_project_id
    );
    match conn.execute(
        "DELETE FROM project_dependency WHERE project_id = ?1 AND depends_on_project_id = ?2",
        rusqlite::params![project_id, depends_on_project_id],
    ) {
        Ok(_) => {
            log::debug!("[project] Dependency deleted successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error deleting dependency: {}", e);
            Err(e.into())
        }
    }
}
