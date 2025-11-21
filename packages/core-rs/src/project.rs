use crate::task::Task;
use rusqlite::{Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum ProjectError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Project {
    pub id: String,
    pub space_id: String,
    pub title: String,
    pub goal_outcome: Option<String>,
    pub status: String,
    pub confidence: Option<i64>,
    pub start_at: Option<i64>,
    pub target_end_at: Option<i64>,
    pub tasks: Vec<Task>,
    pub milestones: Vec<ProjectMilestone>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectMilestone {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub due_at: Option<i64>,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectDependency {
    pub project_id: String,
    pub depends_on_project_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectRisk {
    pub id: String,
    pub project_id: String,
    pub description: String,
    pub impact: String,
    pub likelihood: String,
    pub mitigation: String,
    pub owner_person_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectUpdate {
    pub id: String,
    pub project_id: String,
    pub when_at: i64,
    pub health: String,
    pub summary: String,
}

pub fn delete_project(conn: &mut Connection, id: &str) -> Result<(), ProjectError> {
    log::info!("[project] Deleting project with id: {}", id);

    let tx = conn.transaction()?;

    // Manually delete related entities to satisfy FK constraints
    tx.execute("DELETE FROM project_milestone WHERE project_id = ?1", [id])?;
    tx.execute("DELETE FROM project_risk WHERE project_id = ?1", [id])?;
    tx.execute("DELETE FROM project_update WHERE project_id = ?1", [id])?;
    tx.execute("DELETE FROM project_dependency WHERE project_id = ?1 OR depends_on_project_id = ?1", [id])?;

    // Nullify project_id in Tasks
    tx.execute("UPDATE task SET project_id = NULL WHERE project_id = ?1", [id])?;

    // Nullify project_id in Time Entries
    tx.execute("UPDATE time_entry SET project_id = NULL WHERE project_id = ?1", [id])?;

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
    match conn.execute(
        "INSERT INTO project (id, space_id, title, status) VALUES (?1, ?2, ?3, 'proposed')",
        rusqlite::params![id, space_id, title],
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
            })
        }
        Err(e) => {
            log::error!("[project] Error creating project: {}", e);
            Err(e.into())
        }
    }
}

pub fn get_projects_in_space(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<Project>, ProjectError> {
    log::info!("[project] Getting projects in space: {}", space_id);
    let mut stmt = conn.prepare(
        "SELECT p.id, p.space_id, p.title, p.goal_outcome, p.status, p.confidence, p.start_at, p.target_end_at, t.id, t.title, m.id, m.title
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
                tasks: Vec::new(),
                milestones: Vec::new(),
            });

        if let Ok(task_id_str) = row.get::<_, String>(8) {
            if let (Ok(task_id), Ok(space_id), Ok(project_id), Ok(title)) = (
                Ulid::from_string(&task_id_str),
                Ulid::from_string(&project.space_id),
                Ulid::from_string(&project.id),
                row.get::<_, String>(9),
            ) {
                project.tasks.push(Task {
                    id: task_id,
                    space_id,
                    note_id: None,
                    project_id: Some(project_id),
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
                });
            } else {
                log::warn!("[project] Skipping invalid task data for project {}", project.id);
            }
        }

        if let Ok(milestone_id) = row.get::<_, String>(10) {
            if let Ok(title) = row.get::<_, String>(11) {
                project.milestones.push(ProjectMilestone {
                    id: milestone_id,
                    project_id: project.id.clone(),
                    title,
                    due_at: None,
                    status: "active".to_string(),
                });
            } else {
                log::warn!(
                    "[project] Skipping invalid milestone data for project {}",
                    project.id
                );
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
        "SELECT p.id, p.space_id, p.title, p.goal_outcome, p.status, p.confidence, p.start_at, p.target_end_at, t.id, t.title, m.id, m.title
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
                tasks: Vec::new(),
                milestones: Vec::new(),
            });

        if let Ok(task_id_str) = row.get::<_, String>(8) {
            if let (Ok(task_id), Ok(space_id), Ok(project_id), Ok(title)) = (
                Ulid::from_string(&task_id_str),
                Ulid::from_string(&project.space_id),
                Ulid::from_string(&project.id),
                row.get::<_, String>(9),
            ) {
                project.tasks.push(Task {
                    id: task_id,
                    space_id,
                    note_id: None,
                    project_id: Some(project_id),
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
                });
            } else {
                log::warn!("[project] Skipping invalid task data for project {}", project.id);
            }
        }

        if let Ok(milestone_id) = row.get::<_, String>(10) {
            if let Ok(title) = row.get::<_, String>(11) {
                project.milestones.push(ProjectMilestone {
                    id: milestone_id,
                    project_id: project.id.clone(),
                    title,
                    due_at: None,
                    status: "active".to_string(),
                });
            } else {
                log::warn!(
                    "[project] Skipping invalid milestone data for project {}",
                    project.id
                );
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

pub fn generate_project_brief(conn: &Connection, project_id: &str) -> Result<String, ProjectError> {
    log::info!("[project] Generating brief for project: {}", project_id);
    let project = get_project(conn, project_id)?
        .ok_or(ProjectError::Rusqlite(rusqlite::Error::QueryReturnedNoRows))?;
    log::debug!("[project] Found project: '{}'", project.title);
    let risks = get_project_risks(conn, project_id)?;
    log::debug!("[project] Found {} risks for project", risks.len());
    let updates = get_project_updates(conn, project_id)?;
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
