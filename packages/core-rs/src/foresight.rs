use chrono::{DateTime, Duration, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

use crate::correlation::CorrelationEngine;

#[derive(Error, Debug)]
pub enum ForesightError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Insight generation error: {0}")]
    Generation(String),
    #[error("Analysis error: {0}")]
    Analysis(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Insight {
    pub id: String,
    pub insight_type: InsightType,
    pub title: String,
    pub description: String,
    pub severity: InsightSeverity,
    pub context: InsightContext,
    pub suggested_actions: Vec<SuggestedAction>,
    pub created_at: i64,
    pub dismissed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InsightType {
    DeadlineApproaching,
    HabitStreak,
    ProjectStagnant,
    HighWorkload,
    LowActivity,
    KnowledgeGap,
    MoodCorrelation,
    TaskAccumulation,
    MilestoneRisk,
    FocusOpportunity,
    WeeklyReview,
    TimeAllocation,
    ProductivityTrend,
    GoalProgress,
    SyncConflict,
    DailyBrief,
}

impl InsightType {
    pub fn as_str(&self) -> &'static str {
        match self {
            InsightType::DeadlineApproaching => "deadline_approaching",
            InsightType::HabitStreak => "habit_streak",
            InsightType::ProjectStagnant => "project_stagnant",
            InsightType::HighWorkload => "high_workload",
            InsightType::LowActivity => "low_activity",
            InsightType::KnowledgeGap => "knowledge_gap",
            InsightType::MoodCorrelation => "mood_correlation",
            InsightType::TaskAccumulation => "task_accumulation",
            InsightType::MilestoneRisk => "milestone_risk",
            InsightType::FocusOpportunity => "focus_opportunity",
            InsightType::WeeklyReview => "weekly_review",
            InsightType::TimeAllocation => "time_allocation",
            InsightType::ProductivityTrend => "productivity_trend",
            InsightType::GoalProgress => "goal_progress",
            InsightType::SyncConflict => "sync_conflict",
            InsightType::DailyBrief => "daily_brief",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum InsightSeverity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

impl InsightSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            InsightSeverity::Info => "info",
            InsightSeverity::Low => "low",
            InsightSeverity::Medium => "medium",
            InsightSeverity::High => "high",
            InsightSeverity::Critical => "critical",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InsightContext {
    pub entity_id: Option<String>,
    pub entity_type: Option<String>, // "task", "project", "note", "habit"
    pub metrics: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedAction {
    pub action_type: String,
    pub label: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsightFeedback {
    pub insight_id: String,
    pub action_taken: bool,
    pub action_type: Option<String>,
    pub feedback_type: FeedbackType,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FeedbackType {
    Accepted,
    Dismissed,
    Snoozed,
    NotHelpful,
}

impl FeedbackType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FeedbackType::Accepted => "accepted",
            FeedbackType::Dismissed => "dismissed",
            FeedbackType::Snoozed => "snoozed",
            FeedbackType::NotHelpful => "not_helpful",
        }
    }
}

/// Initialize Foresight tables
pub fn init_foresight_tables(conn: &Connection) -> Result<(), ForesightError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS insight (
            id TEXT PRIMARY KEY,
            insight_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT NOT NULL,
            context_json TEXT NOT NULL,
            suggested_actions_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            dismissed INTEGER NOT NULL DEFAULT 0,
            dismissed_at INTEGER
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS insight_feedback (
            id TEXT PRIMARY KEY,
            insight_id TEXT NOT NULL,
            action_taken INTEGER NOT NULL DEFAULT 0,
            action_type TEXT,
            feedback_type TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (insight_id) REFERENCES insight(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_insight_created_at ON insight(created_at DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_insight_dismissed ON insight(dismissed, created_at DESC)",
        [],
    )?;

    Ok(())
}

/// Generate insights based on current workspace state
pub fn generate_insights(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let mut insights = Vec::new();

    // Single-module insights (existing)
    // Deadline approaching insights
    insights.extend(detect_deadline_pressure(conn, space_id)?);

    // Habit insights
    insights.extend(detect_habit_disruptions(conn, space_id)?);

    // Project stagnation
    insights.extend(detect_project_stagnation(conn, space_id)?);

    // Workload insights
    insights.extend(detect_workload_issues(conn, space_id)?);

    // NEW: Cross-module correlation insights (Foresight 2.0)
    if let Ok(correlation_insights) = generate_correlation_insights(conn, space_id) {
        insights.extend(correlation_insights);
    }

    // Knowledge gap (SRS)
    insights.extend(detect_knowledge_gaps(conn, space_id)?);

    // Weekly review prompt
    insights.extend(detect_weekly_review_need(conn, space_id)?);

    Ok(insights)
}

/// Generate the daily brief (Foresight 3.0 "Ambient OS")
/// This synthesizes all modules into a single morning overview
pub fn generate_daily_brief(conn: &Connection, space_id: Ulid) -> Result<Insight, ForesightError> {
    let now = Utc::now();
    let today_start = now
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp();
    let today_end = now
        .date_naive()
        .and_hms_opt(23, 59, 59)
        .unwrap()
        .and_utc()
        .timestamp();

    // Gather data from all modules
    let mut brief_items = Vec::new();
    let mut suggested_actions = Vec::new();

    // 1. Calendar events (CalDAV)
    if let Ok(upcoming_events) =
        fetch_upcoming_calendar_events(conn, space_id, today_start, today_end)
    {
        if !upcoming_events.is_empty() {
            let next_event = &upcoming_events[0];
            let time_until = next_event.0 - now.timestamp();
            let minutes_until = time_until / 60;

            brief_items.push(format!(
                "📅 Next meeting: **{}** in {} minutes",
                next_event.1, minutes_until
            ));
        }
    }

    // 2. High-priority tasks due today
    if let Ok(tasks) = fetch_tasks_due_today(conn, space_id, today_end) {
        if !tasks.is_empty() {
            let top_task = &tasks[0];
            brief_items.push(format!("✅ Top priority: **{}**", top_task.1));

            suggested_actions.push(SuggestedAction {
                action_type: "start_timer".to_string(),
                label: format!("Start 25-min timer on '{}'", top_task.1),
                description: "Begin a focused work session on your highest priority task"
                    .to_string(),
                parameters: serde_json::json!({
                    "task_id": top_task.0,
                    "duration_minutes": 25
                }),
            });
        }
    }

    // 3. Time tracking from yesterday
    if let Ok(yesterday_hours) = fetch_yesterday_work_hours(conn, space_id) {
        if yesterday_hours > 0.0 {
            brief_items.push(format!("⏱️ Yesterday: {:.1} hours logged", yesterday_hours));
        }
    }

    // 4. Health/mood correlation check
    if let Ok(correlation_insights) = generate_correlation_insights(conn, space_id) {
        for insight in correlation_insights.iter().take(1) {
            if insight.insight_type == InsightType::MoodCorrelation {
                brief_items.push(format!(
                    "💭 Insight: {}",
                    insight
                        .description
                        .split('.')
                        .next()
                        .unwrap_or(&insight.description)
                ));
            }
        }
    }

    // Build the brief description
    use chrono::Timelike;
    let greeting = if now.time().hour() < 12 {
        "Good morning"
    } else if now.time().hour() < 18 {
        "Good afternoon"
    } else {
        "Good evening"
    };

    let description = if brief_items.is_empty() {
        format!("{}. No urgent items today.", greeting)
    } else {
        format!(
            "{}. Here's your day at a glance:\n\n{}",
            greeting,
            brief_items.join("\n\n")
        )
    };

    Ok(Insight {
        id: Ulid::new().to_string(),
        insight_type: InsightType::DailyBrief,
        title: format!("{} - Your Day Ahead", greeting),
        description,
        severity: InsightSeverity::Info,
        context: InsightContext {
            entity_id: None,
            entity_type: Some("daily_brief".to_string()),
            metrics: serde_json::json!({
                "items_count": brief_items.len(),
                "generated_at": now.timestamp(),
            }),
        },
        suggested_actions,
        created_at: now.timestamp(),
        dismissed: false,
    })
}

// Helper functions for daily brief

fn fetch_upcoming_calendar_events(
    conn: &Connection,
    _space_id: Ulid,
    start: i64,
    end: i64,
) -> Result<Vec<(i64, String)>, ForesightError> {
    let mut stmt = conn.prepare(
        "SELECT start_time, summary FROM caldav_event_cache
         WHERE start_time BETWEEN ?1 AND ?2
         ORDER BY start_time ASC LIMIT 3",
    )?;

    let events = stmt.query_map(params![start, end], |row| Ok((row.get(0)?, row.get(1)?)))?;

    let mut result = Vec::new();
    for event in events {
        if let Ok(e) = event {
            result.push(e);
        }
    }

    Ok(result)
}

fn fetch_tasks_due_today(
    conn: &Connection,
    space_id: Ulid,
    today_end: i64,
) -> Result<Vec<(String, String)>, ForesightError> {
    let mut stmt = conn.prepare(
        "SELECT id, title FROM task
         WHERE space_id = ?1 AND status != 'completed'
         AND due_date IS NOT NULL AND due_date <= ?2
         ORDER BY priority DESC, due_date ASC
         LIMIT 5",
    )?;

    let tasks = stmt.query_map(params![space_id.to_string(), today_end], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?;

    let mut result = Vec::new();
    for task in tasks {
        if let Ok(t) = task {
            result.push(t);
        }
    }

    Ok(result)
}

fn fetch_yesterday_work_hours(conn: &Connection, space_id: Ulid) -> Result<f64, ForesightError> {
    let now = Utc::now();
    let yesterday_start = (now - Duration::days(1))
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp();
    let yesterday_end = (now - Duration::days(1))
        .date_naive()
        .and_hms_opt(23, 59, 59)
        .unwrap()
        .and_utc()
        .timestamp();

    let mut stmt = conn.prepare(
        "SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entry
         WHERE space_id = ?1 AND started_at BETWEEN ?2 AND ?3",
    )?;

    let total_seconds: i64 = stmt.query_row(
        params![space_id.to_string(), yesterday_start, yesterday_end],
        |row| row.get(0),
    )?;

    Ok(total_seconds as f64 / 3600.0)
}

/// Detect tasks with approaching deadlines and low completion
fn detect_deadline_pressure(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let mut insights = Vec::new();
    let now = Utc::now().timestamp();
    let three_days_later = (Utc::now() + Duration::days(3)).timestamp();

    let mut stmt = conn.prepare(
        "SELECT id, title, due_date, progress FROM task
         WHERE space_id = ?1 AND status != 'completed' AND due_date BETWEEN ?2 AND ?3 AND (progress IS NULL OR progress < 20)
         ORDER BY due_date ASC",
    )?;

    let tasks = stmt.query_map(
        params![space_id.to_string(), now, three_days_later],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<i32>>(3)?,
            ))
        },
    )?;

    for task_result in tasks {
        if let Ok((task_id, title, due_date, progress)) = task_result {
            let days_until = (due_date - now) / 86400;
            let severity = if days_until <= 1 {
                InsightSeverity::Critical
            } else if days_until <= 2 {
                InsightSeverity::High
            } else {
                InsightSeverity::Medium
            };

            let insight = Insight {
                id: Ulid::new().to_string(),
                insight_type: InsightType::DeadlineApproaching,
                title: format!("Task \"{}\" due in {} day(s)", title, days_until),
                description: format!(
                    "This task has a deadline approaching in {} day(s) but is only {}% complete. Consider prioritizing it.",
                    days_until,
                    progress.unwrap_or(0)
                ),
                severity,
                context: InsightContext {
                    entity_id: Some(task_id.clone()),
                    entity_type: Some("task".to_string()),
                    metrics: serde_json::json!({
                        "days_until_due": days_until,
                        "progress": progress.unwrap_or(0),
                    }),
                },
                suggested_actions: vec![
                    SuggestedAction {
                        action_type: "schedule_focus".to_string(),
                        label: "Schedule 2-hour focus block".to_string(),
                        description: "Block time on your calendar to focus on this task".to_string(),
                        parameters: serde_json::json!({ "task_id": task_id, "duration_minutes": 120 }),
                    },
                    SuggestedAction {
                        action_type: "open_task".to_string(),
                        label: "Open task".to_string(),
                        description: "View and work on this task now".to_string(),
                        parameters: serde_json::json!({ "task_id": task_id }),
                    },
                ],
                created_at: now,
                dismissed: false,
            };

            insights.push(insight);
        }
    }

    Ok(insights)
}

/// Detect habit disruptions or streaks at risk
fn detect_habit_disruptions(
    conn: &Connection,
    _space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    // Placeholder: would integrate with habit tracking system
    // For now, return empty as habit tracking may not have full backend support yet
    Ok(Vec::new())
}

/// Detect projects with no recent updates
fn detect_project_stagnation(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let mut insights = Vec::new();
    let now = Utc::now().timestamp();
    let seven_days_ago = (Utc::now() - Duration::days(7)).timestamp();

    let mut stmt = conn.prepare(
        "SELECT id, name, updated_at FROM project
         WHERE space_id = ?1 AND status = 'active' AND updated_at < ?2
         ORDER BY updated_at ASC",
    )?;

    let projects = stmt.query_map(params![space_id.to_string(), seven_days_ago], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
        ))
    })?;

    for project_result in projects {
        if let Ok((project_id, name, updated_at)) = project_result {
            let days_since = (now - updated_at) / 86400;

            let insight = Insight {
                id: Ulid::new().to_string(),
                insight_type: InsightType::ProjectStagnant,
                title: format!("Project \"{}\" has no recent updates", name),
                description: format!(
                    "This project hasn't been updated in {} days. Consider reviewing it or marking it as on-hold.",
                    days_since
                ),
                severity: if days_since > 14 {
                    InsightSeverity::High
                } else {
                    InsightSeverity::Medium
                },
                context: InsightContext {
                    entity_id: Some(project_id.clone()),
                    entity_type: Some("project".to_string()),
                    metrics: serde_json::json!({
                        "days_since_update": days_since,
                    }),
                },
                suggested_actions: vec![
                    SuggestedAction {
                        action_type: "review_project".to_string(),
                        label: "Review project".to_string(),
                        description: "Open project and add an update or milestone".to_string(),
                        parameters: serde_json::json!({ "project_id": project_id }),
                    },
                    SuggestedAction {
                        action_type: "set_on_hold".to_string(),
                        label: "Mark as on-hold".to_string(),
                        description: "If project is paused, mark it accordingly".to_string(),
                        parameters: serde_json::json!({ "project_id": project_id }),
                    },
                ],
                created_at: now,
                dismissed: false,
            };

            insights.push(insight);
        }
    }

    Ok(insights)
}

/// Detect high workload (too many tasks due soon)
fn detect_workload_issues(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let now = Utc::now().timestamp();
    let today_end = (Utc::now()
        .date_naive()
        .and_hms_opt(23, 59, 59)
        .unwrap()
        .and_utc())
    .timestamp();

    let mut stmt = conn.prepare(
        "SELECT COUNT(*) FROM task
         WHERE space_id = ?1 AND status != 'completed' AND due_date <= ?2",
    )?;

    let count: i64 = stmt.query_row(params![space_id.to_string(), today_end], |row| row.get(0))?;

    if count > 10 {
        let insight = Insight {
            id: Ulid::new().to_string(),
            insight_type: InsightType::HighWorkload,
            title: format!("{} tasks due today or overdue", count),
            description: "You have a high number of tasks due. Consider rescheduling non-urgent items or breaking them into smaller chunks.".to_string(),
            severity: if count > 20 {
                InsightSeverity::High
            } else {
                InsightSeverity::Medium
            },
            context: InsightContext {
                entity_id: None,
                entity_type: None,
                metrics: serde_json::json!({
                    "task_count": count,
                }),
            },
            suggested_actions: vec![
                SuggestedAction {
                    action_type: "view_tasks".to_string(),
                    label: "Review task list".to_string(),
                    description: "Open task board to prioritize".to_string(),
                    parameters: serde_json::json!({}),
                },
                SuggestedAction {
                    action_type: "reschedule_tasks".to_string(),
                    label: "Reschedule non-urgent".to_string(),
                    description: "Move lower priority tasks to future dates".to_string(),
                    parameters: serde_json::json!({}),
                },
            ],
            created_at: now,
            dismissed: false,
        };

        return Ok(vec![insight]);
    }

    Ok(Vec::new())
}

/// Detect overdue SRS reviews
fn detect_knowledge_gaps(
    conn: &Connection,
    _space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let now = Utc::now().timestamp();

    let mut stmt = conn.prepare("SELECT COUNT(*) FROM knowledge_card WHERE next_review <= ?1")?;

    let count: i64 = stmt.query_row(params![now], |row| row.get(0)).unwrap_or(0);

    if count > 5 {
        let insight = Insight {
            id: Ulid::new().to_string(),
            insight_type: InsightType::KnowledgeGap,
            title: format!("{} flashcards overdue for review", count),
            description: "Your spaced repetition reviews are piling up. Take 10 minutes to review some cards.".to_string(),
            severity: if count > 20 {
                InsightSeverity::High
            } else {
                InsightSeverity::Medium
            },
            context: InsightContext {
                entity_id: None,
                entity_type: Some("srs".to_string()),
                metrics: serde_json::json!({
                    "overdue_cards": count,
                }),
            },
            suggested_actions: vec![
                SuggestedAction {
                    action_type: "start_srs_review".to_string(),
                    label: "Review flashcards".to_string(),
                    description: format!("Review {} overdue cards (≈10 min)", std::cmp::min(count, 10)),
                    parameters: serde_json::json!({ "limit": 10 }),
                },
            ],
            created_at: now,
            dismissed: false,
        };

        return Ok(vec![insight]);
    }

    Ok(Vec::new())
}

/// Detect if weekly review is due
fn detect_weekly_review_need(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    let now = Utc::now();
    let seven_days_ago = (now - Duration::days(7)).timestamp();

    // Check if there's a weekly review note in the last 7 days
    let mut stmt = conn.prepare(
        "SELECT COUNT(*) FROM note
         WHERE space_id = ?1 AND title LIKE '%Weekly Review%' AND created_at > ?2",
    )?;

    let count: i64 = stmt.query_row(params![space_id.to_string(), seven_days_ago], |row| {
        row.get(0)
    })?;

    // If it's Friday or later and no review this week
    use chrono::Datelike;
    let weekday = now.weekday().num_days_from_monday();
    if weekday >= 4 && count == 0 {
        let insight = Insight {
            id: Ulid::new().to_string(),
            insight_type: InsightType::WeeklyReview,
            title: "Time for your weekly review".to_string(),
            description: "It's been a week since your last review. Take 15 minutes to reflect on your progress and plan ahead.".to_string(),
            severity: InsightSeverity::Low,
            context: InsightContext {
                entity_id: None,
                entity_type: None,
                metrics: serde_json::json!({}),
            },
            suggested_actions: vec![
                SuggestedAction {
                    action_type: "generate_weekly_review".to_string(),
                    label: "Start weekly review".to_string(),
                    description: "Generate a weekly review note with your accomplishments and upcoming tasks".to_string(),
                    parameters: serde_json::json!({ "space_id": space_id.to_string() }),
                },
            ],
            created_at: now.timestamp(),
            dismissed: false,
        };

        return Ok(vec![insight]);
    }

    Ok(Vec::new())
}

/// Generate cross-module correlation insights (Foresight 2.0)
fn generate_correlation_insights(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<Insight>, ForesightError> {
    // Create correlation engine
    let engine = CorrelationEngine::new();

    // Gather context from all modules (7-day window)
    let context = engine
        .gather_context(conn, space_id, 7)
        .map_err(|e| ForesightError::Analysis(format!("Correlation context error: {}", e)))?;

    // Analyze correlations
    let correlations = engine.analyze(&context);

    // Convert to insights
    let insights = engine.correlations_to_insights(correlations);

    Ok(insights)
}

/// Save insight to database
pub fn save_insight(conn: &Connection, insight: &Insight) -> Result<(), ForesightError> {
    conn.execute(
        "INSERT INTO insight (id, insight_type, title, description, severity, context_json, suggested_actions_json, created_at, dismissed)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            &insight.id,
            insight.insight_type.as_str(),
            &insight.title,
            &insight.description,
            insight.severity.as_str(),
            &serde_json::to_string(&insight.context).unwrap_or_default(),
            &serde_json::to_string(&insight.suggested_actions).unwrap_or_default(),
            &insight.created_at,
            &(insight.dismissed as i32)
        ],
    )?;
    Ok(())
}

/// Get active (non-dismissed) insights
pub fn get_active_insights(conn: &Connection, limit: u32) -> Result<Vec<Insight>, ForesightError> {
    let mut stmt = conn.prepare(
        "SELECT id, insight_type, title, description, severity, context_json, suggested_actions_json, created_at, dismissed
         FROM insight
         WHERE dismissed = 0
         ORDER BY severity DESC, created_at DESC
         LIMIT ?1",
    )?;

    let insights = stmt.query_map([limit.to_string()], |row| {
        let context: InsightContext =
            serde_json::from_str(&row.get::<_, String>(5)?).unwrap_or_default();
        let suggested_actions: Vec<SuggestedAction> =
            serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default();

        Ok(Insight {
            id: row.get(0)?,
            insight_type: parse_insight_type(&row.get::<_, String>(1)?),
            title: row.get(2)?,
            description: row.get(3)?,
            severity: parse_severity(&row.get::<_, String>(4)?),
            context,
            suggested_actions,
            created_at: row.get(7)?,
            dismissed: row.get::<_, i32>(8)? == 1,
        })
    })?;

    let mut result = Vec::new();
    for insight in insights {
        result.push(insight?);
    }

    Ok(result)
}

/// Dismiss an insight
pub fn dismiss_insight(conn: &Connection, insight_id: &str) -> Result<(), ForesightError> {
    let now = Utc::now().timestamp();
    conn.execute(
        "UPDATE insight SET dismissed = 1, dismissed_at = ?1 WHERE id = ?2",
        [&now.to_string(), insight_id],
    )?;

    Ok(())
}

/// Record feedback on an insight
pub fn record_feedback(
    conn: &Connection,
    insight_id: &str,
    action_taken: bool,
    action_type: Option<&str>,
    feedback_type: FeedbackType,
) -> Result<(), ForesightError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO insight_feedback (id, insight_id, action_taken, action_type, feedback_type, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [
            &id,
            insight_id,
            &(if action_taken { "1" } else { "0" }).to_string(),
            &action_type.unwrap_or("").to_string(),
            feedback_type.as_str(),
            &now.to_string(),
        ],
    )?;

    Ok(())
}

// Helper functions
fn parse_insight_type(s: &str) -> InsightType {
    match s {
        "deadline_approaching" => InsightType::DeadlineApproaching,
        "habit_streak" => InsightType::HabitStreak,
        "project_stagnant" => InsightType::ProjectStagnant,
        "high_workload" => InsightType::HighWorkload,
        "low_activity" => InsightType::LowActivity,
        "knowledge_gap" => InsightType::KnowledgeGap,
        "mood_correlation" => InsightType::MoodCorrelation,
        "task_accumulation" => InsightType::TaskAccumulation,
        "milestone_risk" => InsightType::MilestoneRisk,
        "focus_opportunity" => InsightType::FocusOpportunity,
        "weekly_review" => InsightType::WeeklyReview,
        "time_allocation" => InsightType::TimeAllocation,
        "productivity_trend" => InsightType::ProductivityTrend,
        "goal_progress" => InsightType::GoalProgress,
        "sync_conflict" => InsightType::SyncConflict,
        "daily_brief" => InsightType::DailyBrief,
        _ => InsightType::LowActivity,
    }
}

fn parse_severity(s: &str) -> InsightSeverity {
    match s {
        "info" => InsightSeverity::Info,
        "low" => InsightSeverity::Low,
        "medium" => InsightSeverity::Medium,
        "high" => InsightSeverity::High,
        "critical" => InsightSeverity::Critical,
        _ => InsightSeverity::Info,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insight_type_serialization() {
        assert_eq!(
            InsightType::DeadlineApproaching.as_str(),
            "deadline_approaching"
        );
        assert_eq!(InsightType::HighWorkload.as_str(), "high_workload");
    }

    #[test]
    fn test_severity_ordering() {
        assert_eq!(InsightSeverity::Critical.as_str(), "critical");
        assert_eq!(InsightSeverity::Info.as_str(), "info");
    }
}
