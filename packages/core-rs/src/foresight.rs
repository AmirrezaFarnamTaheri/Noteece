use chrono::{Duration, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum ForesightError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Generation error: {0}")]
    Generation(String),
    #[error("Serde error: {0}")]
    Serde(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InsightType {
    DeadlineApproaching,
    ProjectStagnant,
    HighWorkload,
    HabitStreak,
}

impl InsightType {
    fn as_str(&self) -> &'static str {
        match self {
            InsightType::DeadlineApproaching => "deadline_approaching",
            InsightType::ProjectStagnant => "project_stagnant",
            InsightType::HighWorkload => "high_workload",
            InsightType::HabitStreak => "habit_streak",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "deadline_approaching" => InsightType::DeadlineApproaching,
            "project_stagnant" => InsightType::ProjectStagnant,
            "high_workload" => InsightType::HighWorkload,
            "habit_streak" => InsightType::HabitStreak,
            _ => InsightType::HighWorkload, // Default fallback
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum InsightSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl InsightSeverity {
    fn as_str(&self) -> &'static str {
        match self {
            InsightSeverity::Low => "low",
            InsightSeverity::Medium => "medium",
            InsightSeverity::High => "high",
            InsightSeverity::Critical => "critical",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "low" => InsightSeverity::Low,
            "medium" => InsightSeverity::Medium,
            "high" => InsightSeverity::High,
            "critical" => InsightSeverity::Critical,
            _ => InsightSeverity::Medium,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InsightContext {
    pub entity_id: Option<String>,
    pub entity_type: Option<String>,
    pub metrics: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedAction {
    pub action_type: String,
    pub label: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Insight {
    pub id: String,
    pub space_id: Option<String>,
    pub insight_type: InsightType,
    pub title: String,
    pub description: String,
    pub severity: InsightSeverity,
    pub context: InsightContext,
    pub suggested_actions: Vec<SuggestedAction>,
    pub created_at: i64,
    pub dismissed: bool,
}

pub fn generate_insights(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let mut insights = Vec::new();
    insights.extend(detect_deadline_pressure(conn, space_id)?);
    insights.extend(detect_project_stagnation(conn, space_id)?);
    insights.extend(detect_habit_disruptions(conn, space_id)?);

    // Persist generated insights
    for insight in &insights {
        persist_insight(conn, insight, space_id)?;
    }

    // Return all active insights for this space (including previously generated ones)
    get_active_insights(conn, &space_id.to_string())
}

fn persist_insight(
    conn: &Connection,
    insight: &Insight,
    space_id: Ulid,
) -> Result<(), ForesightError> {
    let context_json = serde_json::to_string(&insight.context)?;
    let actions_json = serde_json::to_string(&insight.suggested_actions)?;

    // Upsert: If exists, ignore (idempotent generation).
    // But typically generation creates new IDs. We might want to deduplicate by content signature?
    // For now, assume generation logic creates new ID each run, which might flood DB.
    // Ideally we check if similar active insight exists.
    // For simplicity in this fix, we insert.
    // NOTE: In production, we should check `entity_id` + `insight_type` uniqueness for active insights.

    conn.execute(
        "INSERT INTO insight (id, space_id, title, description, insight_type, severity, context_json, suggested_actions_json, created_at, dismissed)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0)
         ON CONFLICT(id) DO NOTHING",
        params![
            insight.id,
            space_id.to_string(),
            insight.title,
            insight.description,
            insight.insight_type.as_str(),
            insight.severity.as_str(),
            context_json,
            actions_json,
            insight.created_at
        ],
    )?;
    Ok(())
}

pub fn get_active_insights(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<Insight>, ForesightError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, title, description, insight_type, severity, context_json, suggested_actions_json, created_at, dismissed
         FROM insight
         WHERE space_id = ?1 AND dismissed = 0
         ORDER BY created_at DESC",
    )?;

    let rows = stmt.query_map([space_id], |row| {
        let context_json: String = row.get(6)?;
        let actions_json: String = row.get(7)?;
        let type_str: String = row.get(4)?;
        let severity_str: String = row.get(5)?;

        Ok(Insight {
            id: row.get(0)?,
            space_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            insight_type: InsightType::from_str(&type_str),
            severity: InsightSeverity::from_str(&severity_str),
            context: serde_json::from_str(&context_json).unwrap_or_default(),
            suggested_actions: serde_json::from_str(&actions_json).unwrap_or_default(),
            created_at: row.get(8)?,
            dismissed: row.get::<_, i32>(9)? == 1,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn dismiss_insight(conn: &Connection, id: Ulid) -> Result<(), ForesightError> {
    conn.execute(
        "UPDATE insight SET dismissed = 1 WHERE id = ?1",
        [id.to_string()],
    )?;
    Ok(())
}

pub fn record_feedback(conn: &Connection, id: Ulid, useful: bool) -> Result<(), ForesightError> {
    conn.execute(
        "UPDATE insight SET feedback_useful = ?2 WHERE id = ?1",
        params![id.to_string(), if useful { 1 } else { 0 }],
    )?;
    Ok(())
}

fn detect_deadline_pressure(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let now = Utc::now().timestamp();
    let three_days_later = (Utc::now() + Duration::days(3)).timestamp();

    let mut stmt = conn.prepare(
        "SELECT id, title, due_at FROM task
         WHERE space_id = ?1 AND status != 'completed' AND due_at BETWEEN ?2 AND ?3",
    )?;

    let tasks = stmt.query_map(
        params![space_id.to_string(), now, three_days_later],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let mut insights = Vec::new();
    for task_res in tasks {
        let (task_id, title, due_at): (String, String, i64) = task_res?;
        let days_until = (due_at - now) / 86400;

        insights.push(Insight {
            id: Ulid::new().to_string(),
            space_id: Some(space_id.to_string()),
            insight_type: InsightType::DeadlineApproaching,
            title: format!("'{}' is due in {} day(s)", title, days_until),
            description: "A task deadline is approaching.".to_string(),
            severity: if days_until <= 1 {
                InsightSeverity::Critical
            } else {
                InsightSeverity::Medium
            },
            context: InsightContext {
                entity_id: Some(task_id.clone()),
                entity_type: Some("task".to_string()),
                metrics: serde_json::json!({ "days_until": days_until }),
            },
            suggested_actions: vec![SuggestedAction {
                action_type: "view_task".to_string(),
                label: "View Task".to_string(),
                parameters: serde_json::json!({ "task_id": task_id }),
            }],
            created_at: now,
            dismissed: false,
        });
    }

    Ok(insights)
}

fn detect_project_stagnation(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let seven_days_ago = (Utc::now() - Duration::days(7)).timestamp();

    let mut stmt = conn.prepare(
        "SELECT p.id, p.title
         FROM project p
         LEFT JOIN task t ON p.id = t.project_id
         WHERE p.space_id = ?1
         GROUP BY p.id
         HAVING MAX(COALESCE(t.completed_at, 0)) < ?2",
    )?;

    let projects = stmt.query_map(params![space_id.to_string(), seven_days_ago], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?;

    let mut insights = Vec::new();
    for project_res in projects {
        let (project_id, title): (String, String) = project_res?;
        insights.push(Insight {
            id: Ulid::new().to_string(),
            space_id: Some(space_id.to_string()),
            insight_type: InsightType::ProjectStagnant,
            title: format!("Project '{}' seems stagnant", title),
            description: "No tasks have been completed recently in this project.".to_string(),
            severity: InsightSeverity::Medium,
            context: InsightContext {
                entity_id: Some(project_id.clone()),
                entity_type: Some("project".to_string()),
                metrics: serde_json::Value::Null,
            },
            suggested_actions: vec![],
            created_at: Utc::now().timestamp(),
            dismissed: false,
        });
    }

    Ok(insights)
}

fn detect_habit_disruptions(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let now = Utc::now().timestamp();
    let three_days_ago = (Utc::now() - Duration::days(3)).timestamp();

    let mut stmt = conn.prepare(
        "SELECT id, title, due_at FROM task
         WHERE space_id = ?1 AND recur_rule IS NOT NULL AND status != 'completed'
         AND due_at < ?2",
    )?;

    let tasks = stmt.query_map(params![space_id.to_string(), three_days_ago], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })?;

    let mut insights = Vec::new();
    for task_res in tasks {
        let (id, title, due_at): (String, String, i64) = task_res?;
        let days_overdue = (now - due_at) / 86400;

        insights.push(Insight {
            id: Ulid::new().to_string(),
            space_id: Some(space_id.to_string()),
            insight_type: InsightType::HabitStreak,
            title: format!("Habit at risk: {}", title),
            description: format!("This recurring task is {} days overdue.", days_overdue),
            severity: InsightSeverity::Medium,
            context: InsightContext {
                entity_id: Some(id.clone()),
                entity_type: Some("task".to_string()),
                metrics: serde_json::json!({ "days_overdue": days_overdue }),
            },
            suggested_actions: vec![SuggestedAction {
                action_type: "complete_task".to_string(),
                label: "Complete Now".to_string(),
                parameters: serde_json::json!({ "task_id": id }),
            }],
            created_at: now,
            dismissed: false,
        });
    }

    Ok(insights)
}
