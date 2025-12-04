use crate::project::models::*;
use crate::task::Task;
use rusqlite::{Connection, Result};
use ulid::Ulid;

pub fn delete_project(conn: &mut Connection, id: &str) -> Result<(), ProjectError> {
    log::info!("[project] Deleting project with id: {}", id);

    let tx = conn.transaction()?;

    // Manually delete related entities to satisfy FK constraints
    tx.execute("DELETE FROM project_milestone WHERE project_id = ?1", [id])?;
    tx.execute("DELETE FROM project_risk WHERE project_id = ?1", [id])?;
    tx.execute("DELETE FROM project_update WHERE project_id = ?1", [id])?;
    tx.execute(
        "DELETE FROM project_dependency WHERE project_id = ?1 OR depends_on_project_id = ?1",
        [id],
    )?;

    // Nullify project_id in Tasks
    tx.execute(
        "UPDATE task SET project_id = NULL WHERE project_id = ?1",
        [id],
    )?;

    // Nullify project_id in Time Entries
    tx.execute(
        "UPDATE time_entry SET project_id = NULL WHERE project_id = ?1",
        [id],
    )?;

    match tx.execute("DELETE FROM project WHERE id = ?1", [id]) {
        Ok(_) => {
            tx.commit()?;
            log::debug!("[project] Project deleted successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("[project] Error deleting project: {}", e);
            // Transaction will be rolled back automatically when tx is dropped if not committed
            Err(e.into())
        }
    }
}

pub fn create_project(
    conn: &Connection,
    space_id: &str,
    title: &str,
) -> Result<Project, ProjectError> {
    log::info!(
        "[project] Creating project '{}' in space {}",
        title,
        space_id
    );
    let id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();
    match conn.execute(
        "INSERT INTO project (id, space_id, title, status, updated_at) VALUES (?1, ?2, ?3, 'proposed', ?4)",
        rusqlite::params![id, space_id, title, now],
    ) {
        Ok(_) => {
            log::debug!("[project] Project created successfully with id: {}", id);
            Ok(Project {
                id,
                space_id: space_id.to_string(),
                title: title.to_string(),
                goal_outcome: None,
                status: "proposed".to_string(),
                confidence: None,
                start_at: None,
                target_end_at: None,
                tasks: vec![],
                milestones: vec![],
                updated_at: now,
            })
        }
        Err(e) => {
            log::error!("[project] Error creating project: {}", e);
            Err(e.into())
        }
    }
}

pub fn update_project(conn: &Connection, project: &Project) -> Result<(), ProjectError> {
    log::info!("[project] Updating project with id: {}", project.id);

    // Validate status transition
    let current_status: String = conn.query_row(
        "SELECT status FROM project WHERE id = ?1",
        [project.id.as_str()],
        |row| row.get(0),
    )?;

    validate_status_transition(&current_status, &project.status)?;

    let now = chrono::Utc::now().timestamp();
    match conn.execute(
        "UPDATE project SET title = ?1, goal_outcome = ?2, status = ?3, confidence = ?4, start_at = ?5, target_end_at = ?6, updated_at = ?7 WHERE id = ?8",
        rusqlite::params![
            project.title,
            project.goal_outcome,
            project.status,
            project.confidence,
            project.start_at,
            project.target_end_at,
            now,
            project.id
        ],
    ) {
        Ok(_) => {
            log::debug!("[project] Project updated successfully");
            Ok(())
        }
        Err(e) => {
             log::error!("[project] Error updating project: {}", e);
             Err(e.into())
        }
    }
}

fn validate_status_transition(current: &str, new: &str) -> Result<(), ProjectError> {
    if current == new {
        return Ok(());
    }

    let valid = match current {
        "proposed" => matches!(new, "active" | "cancelled" | "on_hold"),
        "active" => matches!(new, "completed" | "on_hold" | "cancelled"),
        "on_hold" => matches!(new, "active" | "cancelled" | "completed"),
        "completed" => matches!(new, "active" | "on_hold"), // Re-opening
        "cancelled" => matches!(new, "proposed" | "active"), // Reactivating
        _ => true, // Allow transition from unknown states to recover
    };

    if valid {
        Ok(())
    } else {
        Err(ProjectError::InvalidData(format!(
            "Invalid status transition from '{}' to '{}'",
            current, new
        )))
    }
}

pub fn get_projects_in_space(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<Project>, ProjectError> {
    log::info!("[project] Getting projects in space: {}", space_id);
    let mut stmt = conn.prepare(
        "SELECT p.id, p.space_id, p.title, p.goal_outcome, p.status, p.confidence, p.start_at, p.target_end_at, p.updated_at, t.id, t.title, m.id, m.title
         FROM project p
         LEFT JOIN task t ON p.id = t.project_id
         LEFT JOIN project_milestone m ON p.id = m.project_id
         WHERE p.space_id = ?1",
    )?;

    let mut projects: std::collections::HashMap<String, Project> = std::collections::HashMap::new();
    let rows = stmt.query_map([space_id], |row| {
        let project_id: String = row.get(0)?;
        let project = projects
            .entry(project_id.clone())
            .or_insert_with(|| Project {
                id: project_id,
                space_id: row.get(1).unwrap_or_default(),
                title: row.get(2).unwrap_or_default(),
                goal_outcome: row.get(3).unwrap_or_default(),
                status: row.get(4).unwrap_or_default(),
                confidence: row.get(5).unwrap_or_default(),
                start_at: row.get(6).unwrap_or_default(),
                target_end_at: row.get(7).unwrap_or_default(),
                updated_at: row.get(8).unwrap_or_default(),
                tasks: Vec::new(),
                milestones: Vec::new(),
            });

        if let Ok(task_id_str) = row.get::<_, String>(9) {
            if let Ok(task_id) = Ulid::from_string(&task_id_str) {
                let space_id = Ulid::from_string(&project.space_id).unwrap_or_default();
                let project_id_ulid = Ulid::from_string(&project.id).unwrap_or_default();

                if let Ok(title) = row.get::<_, String>(10) {
                    project.tasks.push(Task {
                        id: task_id,
                        space_id,
                        note_id: None,
                        project_id: Some(project_id_ulid),
                        parent_task_id: None,
                        title,
                        description: None,
                        status: "inbox".to_string(),
                        due_at: None,
                        start_at: None,
                        completed_at: None,
                        priority: None,
                        estimate_minutes: None,
                        recur_rule: None,
                        context: None,
                        area: None,
                        updated_at: 0,
                    });
                }
            }
        }

        if let Ok(milestone_id) = row.get::<_, String>(11) {
            if let Ok(title) = row.get::<_, String>(12) {
                project.milestones.push(ProjectMilestone {
                    id: milestone_id,
                    project_id: project.id.clone(),
                    title,
                    due_at: None,
                    status: "active".to_string(),
                });
            }
        }

        Ok(())
    })?;

    rows.for_each(|row| {
        if let Err(e) = row {
            log::error!("[project] Error processing row: {}", e);
        }
    });

    Ok(projects.into_values().collect())
}

pub fn get_project(conn: &Connection, id: &str) -> Result<Option<Project>, ProjectError> {
    log::info!("[project] Getting project with id: {}", id);
    let mut stmt = conn.prepare(
        "SELECT p.id, p.space_id, p.title, p.goal_outcome, p.status, p.confidence, p.start_at, p.target_end_at, p.updated_at, t.id, t.title, m.id, m.title
         FROM project p
         LEFT JOIN task t ON p.id = t.project_id
         LEFT JOIN project_milestone m ON p.id = m.project_id
         WHERE p.id = ?1",
    )?;

    let mut projects: std::collections::HashMap<String, Project> = std::collections::HashMap::new();
    let rows = stmt.query_map([id], |row| {
        let project_id: String = row.get(0)?;
        let project = projects
            .entry(project_id.clone())
            .or_insert_with(|| Project {
                id: project_id,
                space_id: row.get(1).unwrap_or_default(),
                title: row.get(2).unwrap_or_default(),
                goal_outcome: row.get(3).unwrap_or_default(),
                status: row.get(4).unwrap_or_default(),
                confidence: row.get(5).unwrap_or_default(),
                start_at: row.get(6).unwrap_or_default(),
                target_end_at: row.get(7).unwrap_or_default(),
                updated_at: row.get(8).unwrap_or_default(),
                tasks: Vec::new(),
                milestones: Vec::new(),
            });

        if let Ok(task_id_str) = row.get::<_, String>(9) {
            if let Ok(task_id) = Ulid::from_string(&task_id_str) {
                let space_id = Ulid::from_string(&project.space_id).unwrap_or_default();
                let project_id_ulid = Ulid::from_string(&project.id).unwrap_or_default();

                if let Ok(title) = row.get::<_, String>(10) {
                    project.tasks.push(Task {
                        id: task_id,
                        space_id,
                        note_id: None,
                        project_id: Some(project_id_ulid),
                        parent_task_id: None,
                        title,
                        description: None,
                        status: "inbox".to_string(),
                        due_at: None,
                        start_at: None,
                        completed_at: None,
                        priority: None,
                        estimate_minutes: None,
                        recur_rule: None,
                        context: None,
                        area: None,
                        updated_at: 0,
                    });
                }
            }
        }

        if let Ok(milestone_id) = row.get::<_, String>(11) {
            if let Ok(title) = row.get::<_, String>(12) {
                project.milestones.push(ProjectMilestone {
                    id: milestone_id,
                    project_id: project.id.clone(),
                    title,
                    due_at: None,
                    status: "active".to_string(),
                });
            }
        }

        Ok(())
    })?;

    rows.for_each(|row| {
        if let Err(e) = row {
            log::error!("[project] Error processing row: {}", e);
        }
    });

    Ok(projects.into_values().next())
}

pub fn generate_project_brief(conn: &Connection, project_id: &str) -> Result<String, ProjectError> {
    log::info!("[project] Generating brief for project: {}", project_id);
    let project = get_project(conn, project_id)?
        .ok_or(ProjectError::Rusqlite(rusqlite::Error::QueryReturnedNoRows))?;
    log::debug!("[project] Found project: '{}'", project.title);
    let risks = super::risk::get_project_risks(conn, project_id)?;
    log::debug!("[project] Found {} risks for project", risks.len());
    let updates = super::update::get_project_updates(conn, project_id)?;
    log::debug!("[project] Found {} updates for project", updates.len());

    let mut brief = format!("# {}\n\n", project.title);
    if let Some(goal) = project.goal_outcome {
        brief.push_str(&format!("**Goal:** {}\n\n", goal));
    }
    brief.push_str(&format!("**Status:** {}\n\n", project.status));

    brief.push_str("## Key Risks\n");
    if risks.is_empty() {
        brief.push_str("- None\n");
    } else {
        for risk in risks {
            brief.push_str(&format!("- {}\n", risk.description));
        }
    }

    brief.push_str("\n## Latest Update\n");
    if let Some(update) = updates.last() {
        brief.push_str(&format!("**Health:** {}\n\n", update.health));
        brief.push_str(&format!("{}\n", update.summary));
    } else {
        brief.push_str("- None\n");
    }

    Ok(brief)
}
