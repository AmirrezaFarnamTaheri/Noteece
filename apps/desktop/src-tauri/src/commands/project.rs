use crate::state::DbConnection;
use core_rs::project::*;
use tauri::State;

#[tauri::command]
pub fn get_project_cmd(db: State<DbConnection>, id: String) -> Result<Option<Project>, String> {
    crate::with_db!(db, conn, {
        core_rs::project::get_project(&conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_projects_in_space_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<Project>, String> {
    crate::with_db!(db, conn, {
        core_rs::project::get_projects_in_space(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_milestones_cmd(
    db: State<DbConnection>,
    project_id: String,
) -> Result<Vec<ProjectMilestone>, String> {
    crate::with_db!(db, conn, {
        core_rs::project::get_project_milestones(&conn, &project_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_risks_cmd(
    db: State<DbConnection>,
    project_id: String,
) -> Result<Vec<ProjectRisk>, String> {
    crate::with_db!(db, conn, {
        core_rs::project::get_project_risks(&conn, &project_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_updates_cmd(
    db: State<DbConnection>,
    project_id: String,
) -> Result<Vec<ProjectUpdate>, String> {
    crate::with_db!(db, conn, {
        core_rs::project::get_project_updates(&conn, &project_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_project_risk_cmd(
    db: State<DbConnection>,
    project_id: String,
    description: String,
    likelihood: String,
    impact: String,
) -> Result<ProjectRisk, String> {
    crate::with_db!(db, conn, {
        core_rs::project::create_project_risk(
            &conn,
            &project_id,
            &description,
            &likelihood,
            &impact,
            "",
            None,
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_project_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    crate::with_db_mut!(db, conn, {
        core_rs::project::delete_project(&mut conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_project_cmd(db: State<DbConnection>, project: Project) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::project::update_project(&conn, &project).map_err(|e| e.to_string())
    })
}
