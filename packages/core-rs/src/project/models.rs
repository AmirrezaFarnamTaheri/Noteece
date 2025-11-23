use crate::task::Task;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ProjectError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("Invalid data: {0}")]
    InvalidData(String),
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
    pub updated_at: i64,
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
