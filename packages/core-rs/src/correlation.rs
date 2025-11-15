use chrono::{Duration, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use ulid::Ulid;

use crate::foresight::{Insight, InsightContext, InsightSeverity, InsightType, SuggestedAction};
use crate::personal_modes::{HealthMetric, Transaction};
use crate::task::Task;
use crate::time_tracking::TimeEntry;

#[derive(Error, Debug)]
pub enum CorrelationError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Correlation analysis error: {0}")]
    Analysis(String),
    #[error("Simulation error: {0}")]
    Simulation(String),
}

/// Correlation strength from 0.0 (no correlation) to 1.0 (perfect correlation)
pub type CorrelationStrength = f64;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CorrelationType {
    HealthWorkload,
    FinanceTasks,
    CalendarProjects,
    TimeProductivity,
}

#[derive(Debug, Clone)]
pub struct Correlation {
    pub correlation_type: CorrelationType,
    pub strength: CorrelationStrength,
    pub entities: Vec<String>, // IDs of correlated entities
    pub pattern_description: String,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct CorrelationContext {
    pub space_id: Ulid,
    pub health_data: Vec<HealthMetric>,
    pub time_entries: Vec<TimeEntry>,
    pub tasks: Vec<Task>,
    pub transactions: Vec<Transaction>,
    pub start_time: i64,
    pub end_time: i64,
}

pub struct CorrelationEngine {
    short_term_days: i64,
    medium_term_days: i64,
    long_term_days: i64,
}

impl CorrelationEngine {
    pub fn new() -> Self {
        Self {
            short_term_days: 7,
            medium_term_days: 30,
            long_term_days: 90,
        }
    }

    pub fn with_ranges(short_term_days: i64, medium_term_days: i64, long_term_days: i64) -> Self {
        Self {
            short_term_days,
            medium_term_days,
            long_term_days,
        }
    }

    /// Gather all relevant data for correlation analysis
    pub fn gather_context(
        &self,
        conn: &Connection,
        space_id: Ulid,
        time_window_days: i64,
    ) -> Result<CorrelationContext, CorrelationError> {
        let now = Utc::now().timestamp();
        let start_time = now - (time_window_days * 86400);

        // Gather health metrics
        let health_data = self.fetch_health_metrics(conn, space_id, start_time)?;

        // Gather time entries
        let time_entries = self.fetch_time_entries(conn, space_id, start_time)?;

        // Gather tasks
        let tasks = self.fetch_tasks(conn, space_id)?;

        // Gather transactions
        let transactions = self.fetch_transactions(conn, space_id, start_time)?;

        Ok(CorrelationContext {
            space_id,
            health_data,
            time_entries,
            tasks,
            transactions,
            start_time,
            end_time: now,
        })
    }

    /// Analyze context and detect correlations
    pub fn analyze(&self, context: &CorrelationContext) -> Vec<Correlation> {
        let mut correlations = Vec::new();

        // Detect health-workload correlation
        if let Some(corr) = self.detect_health_workload(context) {
            correlations.push(corr);
        }

        // Detect finance-task correlation
        if let Some(corr) = self.detect_finance_tasks(context) {
            correlations.push(corr);
        }

        // Detect time-productivity correlation
        if let Some(corr) = self.detect_time_productivity(context) {
            correlations.push(corr);
        }

        correlations
    }

    /// Convert correlations to actionable insights
    pub fn correlations_to_insights(&self, correlations: Vec<Correlation>) -> Vec<Insight> {
        correlations
            .into_iter()
            .filter(|c| c.strength >= 0.7) // Only strong correlations
            .filter_map(|c| self.correlation_to_insight(c))
            .collect()
    }

    // ===== Health × Workload Correlation =====

    fn detect_health_workload(&self, context: &CorrelationContext) -> Option<Correlation> {
        // Find low mood/energy periods
        let low_mood_days: Vec<i64> = context
            .health_data
            .iter()
            .filter(|m| {
                m.metric_type == "mood" && m.value <= 3.0 // Assuming 1-5 scale
            })
            .map(|m| m.recorded_at / 86400) // Group by day
            .collect();

        if low_mood_days.len() < 3 {
            return None; // Need at least 3 days of low mood
        }

        // Calculate work hours during low mood periods
        let low_mood_start = low_mood_days.iter().min()? * 86400;
        let low_mood_end = low_mood_days.iter().max()? * 86400 + 86400;

        let work_hours: f64 = context
            .time_entries
            .iter()
            .filter(|e| {
                e.started_at >= low_mood_start
                    && e.started_at <= low_mood_end
                    && e.ended_at.is_some()
            })
            .map(|e| {
                let duration = e.ended_at.unwrap() - e.started_at;
                duration as f64 / 3600.0
            })
            .sum();

        // Determine correlation strength
        let expected_hours = low_mood_days.len() as f64 * 8.0;
        let overwork_ratio = work_hours / expected_hours;

        if overwork_ratio > 1.3 {
            // 30% overwork
            let mut metadata = HashMap::new();
            metadata.insert(
                "low_mood_days".to_string(),
                serde_json::json!(low_mood_days.len()),
            );
            metadata.insert("work_hours".to_string(), serde_json::json!(work_hours));
            metadata.insert(
                "overwork_ratio".to_string(),
                serde_json::json!(overwork_ratio),
            );

            Some(Correlation {
                correlation_type: CorrelationType::HealthWorkload,
                strength: (overwork_ratio - 1.0).min(1.0),
                entities: vec![],
                pattern_description: format!(
                    "Low mood for {} days correlates with {} hours of work ({}% over baseline)",
                    low_mood_days.len(),
                    work_hours.round(),
                    ((overwork_ratio - 1.0) * 100.0).round()
                ),
                metadata,
            })
        } else {
            None
        }
    }

    // ===== Finance × Tasks Correlation =====

    fn detect_finance_tasks(&self, context: &CorrelationContext) -> Option<Correlation> {
        // Calculate remaining budget by category
        let mut category_budgets: HashMap<String, f64> = HashMap::new();

        for transaction in &context.transactions {
            let spent = if transaction.transaction_type == "expense" {
                transaction.amount
            } else {
                -transaction.amount
            };

            *category_budgets
                .entry(transaction.category.clone())
                .or_insert(0.0) += spent;
        }

        // Find tasks that might require spending
        let spending_tasks: Vec<&Task> = context
            .tasks
            .iter()
            .filter(|t| {
                t.title.to_lowercase().contains("buy")
                    || t.title.to_lowercase().contains("purchase")
                    || t.title.to_lowercase().contains("order")
            })
            .collect();

        if spending_tasks.is_empty() {
            return None;
        }

        // Check for budget constraints
        let discretionary_spent = category_budgets.get("Discretionary").unwrap_or(&0.0);
        let budget_pressure = (discretionary_spent / 1000.0).min(1.0); // Assume $1000 budget

        if budget_pressure > 0.85 && !spending_tasks.is_empty() {
            let mut metadata = HashMap::new();
            metadata.insert(
                "budget_pressure".to_string(),
                serde_json::json!(budget_pressure),
            );
            metadata.insert(
                "spending_tasks".to_string(),
                serde_json::json!(spending_tasks.len()),
            );

            Some(Correlation {
                correlation_type: CorrelationType::FinanceTasks,
                strength: budget_pressure,
                entities: spending_tasks.iter().map(|t| t.id.to_string()).collect(),
                pattern_description: format!(
                    "Budget at {}% with {} pending purchase tasks",
                    (budget_pressure * 100.0).round(),
                    spending_tasks.len()
                ),
                metadata,
            })
        } else {
            None
        }
    }

    // ===== Time × Productivity Correlation =====

    fn detect_time_productivity(&self, context: &CorrelationContext) -> Option<Correlation> {
        // Find tasks with high time investment compared to estimate
        let mut time_by_task: HashMap<Ulid, f64> = HashMap::new();

        for entry in &context.time_entries {
            if let Some(task_id) = &entry.task_id {
                let duration = if let Some(ended) = entry.ended_at {
                    (ended - entry.started_at) as f64 / 3600.0
                } else {
                    0.0
                };
                *time_by_task.entry(task_id.clone()).or_insert(0.0) += duration;
            }
        }

        // Find tasks where actual time exceeds estimate significantly
        for (task_id, hours) in time_by_task {
            if hours > 10.0 {
                // More than 10 hours logged
                if let Some(task) = context.tasks.iter().find(|t| t.id == task_id) {
                    // Check if task is not completed and time exceeds estimate
                    let estimated_hours = task
                        .estimate_minutes
                        .map(|m| m as f64 / 60.0)
                        .unwrap_or(8.0);
                    let time_ratio = hours / estimated_hours;

                    if time_ratio > 1.5 && task.completed_at.is_none() {
                        // Time exceeds estimate by 50%+
                        let mut metadata = HashMap::new();
                        metadata.insert("hours_logged".to_string(), serde_json::json!(hours));
                        metadata.insert(
                            "estimated_hours".to_string(),
                            serde_json::json!(estimated_hours),
                        );
                        metadata.insert("time_ratio".to_string(), serde_json::json!(time_ratio));
                        metadata.insert(
                            "task_title".to_string(),
                            serde_json::json!(task.title.clone()),
                        );

                        return Some(Correlation {
                            correlation_type: CorrelationType::TimeProductivity,
                            strength: 0.8,
                            entities: vec![task_id.to_string()],
                            pattern_description: format!(
                                "Task '{}' has {} hours logged, {}x the estimate ({}h). Possible blocker.",
                                task.title,
                                hours.round(),
                                time_ratio.round(),
                                estimated_hours.round()
                            ),
                            metadata,
                        });
                    }
                }
            }
        }

        None
    }

    // ===== Insight Generation =====

    fn correlation_to_insight(&self, correlation: Correlation) -> Option<Insight> {
        let now = Utc::now().timestamp();
        let id = Ulid::new().to_string();

        match correlation.correlation_type {
            CorrelationType::HealthWorkload => {
                let work_hours = correlation.metadata.get("work_hours")?.as_f64()?;
                let low_mood_days = correlation.metadata.get("low_mood_days")?.as_u64()?;

                Some(Insight {
                    id,
                    insight_type: InsightType::MoodCorrelation,
                    title: "Workload affecting well-being".to_string(),
                    description: format!(
                        "Your mood has been low for {} days, coinciding with {} hours of work. Consider scheduling recovery time.",
                        low_mood_days,
                        work_hours.round()
                    ),
                    severity: InsightSeverity::Medium,
                    context: InsightContext {
                        entity_id: None,
                        entity_type: Some("workload".to_string()),
                        metrics: serde_json::json!({
                            "work_hours": work_hours,
                            "low_mood_days": low_mood_days,
                        }),
                    },
                    suggested_actions: vec![SuggestedAction {
                        action_type: "schedule_recovery".to_string(),
                        label: "Block recovery time".to_string(),
                        description: "Schedule 90 minutes for rest and recovery".to_string(),
                        parameters: serde_json::json!({
                            "duration_minutes": 90,
                        }),
                    }],
                    created_at: now,
                    dismissed: false,
                })
            }

            CorrelationType::FinanceTasks => {
                let budget_pressure = correlation.metadata.get("budget_pressure")?.as_f64()?;
                let task_ids = &correlation.entities;

                Some(Insight {
                    id,
                    insight_type: InsightType::GoalProgress,
                    title: "Budget constraint vs. spending tasks".to_string(),
                    description: format!(
                        "Your budget is at {}% capacity, but you have {} tasks that require spending.",
                        (budget_pressure * 100.0).round(),
                        task_ids.len()
                    ),
                    severity: InsightSeverity::Low,
                    context: InsightContext {
                        entity_id: None,
                        entity_type: Some("finance".to_string()),
                        metrics: serde_json::json!({
                            "budget_pressure": budget_pressure,
                            "task_count": task_ids.len(),
                            "task_ids": task_ids,
                        }),
                    },
                    suggested_actions: vec![SuggestedAction {
                        action_type: "snooze_tasks".to_string(),
                        label: "Defer spending tasks".to_string(),
                        description: "Snooze these tasks until next budget cycle".to_string(),
                        parameters: serde_json::json!({
                            "task_ids": task_ids,
                            "until_days": 30,
                        }),
                    }],
                    created_at: now,
                    dismissed: false,
                })
            }

            CorrelationType::TimeProductivity => {
                let task_id = correlation.entities.first()?;
                let hours = correlation.metadata.get("hours_logged")?.as_f64()?;
                let estimated = correlation.metadata.get("estimated_hours")?.as_f64()?;
                let time_ratio = correlation.metadata.get("time_ratio")?.as_f64()?;

                Some(Insight {
                    id,
                    insight_type: InsightType::ProductivityTrend,
                    title: "Time investment exceeds estimate".to_string(),
                    description: format!(
                        "You've spent {} hours on this task, {}x the {} hour estimate. This may indicate blockers.",
                        hours.round(),
                        time_ratio.round(),
                        estimated.round()
                    ),
                    severity: InsightSeverity::Medium,
                    context: InsightContext {
                        entity_id: Some(task_id.clone()),
                        entity_type: Some("task".to_string()),
                        metrics: serde_json::json!({
                            "task_id": task_id,
                            "hours_logged": hours,
                            "estimated_hours": estimated,
                            "time_ratio": time_ratio,
                        }),
                    },
                    suggested_actions: vec![
                        SuggestedAction {
                            action_type: "break_down_task".to_string(),
                            label: "Break down task".to_string(),
                            description: "Create smaller subtasks to identify blockers".to_string(),
                            parameters: serde_json::json!({
                                "task_id": task_id,
                            }),
                        },
                        SuggestedAction {
                            action_type: "flag_task".to_string(),
                            label: "Flag as blocked".to_string(),
                            description: "Mark this task as blocked for review".to_string(),
                            parameters: serde_json::json!({
                                "task_id": task_id,
                            }),
                        },
                    ],
                    created_at: now,
                    dismissed: false,
                })
            }

            _ => None,
        }
    }

    // ===== Data Fetching Helpers =====

    fn fetch_health_metrics(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<HealthMetric>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, space_id, note_id, metric_type, value, unit, notes, recorded_at, created_at
             FROM health_metric
             WHERE space_id = ?1 AND recorded_at >= ?2
             ORDER BY recorded_at DESC",
        )?;

        let metrics = stmt
            .query_map(params![space_id.to_string(), since], |row| {
                Ok(HealthMetric {
                    id: row.get(0)?,
                    space_id: row.get(1)?,
                    note_id: row.get(2)?,
                    metric_type: row.get(3)?,
                    value: row.get(4)?,
                    unit: row.get(5)?,
                    notes: row.get(6)?,
                    recorded_at: row.get(7)?,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(metrics)
    }

    fn fetch_time_entries(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<TimeEntry>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
             FROM time_entry
             WHERE space_id = ?1 AND started_at >= ?2
             ORDER BY started_at DESC",
        )?;

        let entries = stmt
            .query_map(params![space_id.to_string(), since], |row| {
                let id_str: String = row.get(0)?;
                let space_id_str: String = row.get(1)?;
                let task_id_str: Option<String> = row.get(2)?;
                let project_id_str: Option<String> = row.get(3)?;
                let note_id_str: Option<String> = row.get(4)?;

                Ok(TimeEntry {
                    id: Ulid::from_string(&id_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    space_id: Ulid::from_string(&space_id_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            1,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    task_id: task_id_str.and_then(|s| Ulid::from_string(&s).ok()),
                    project_id: project_id_str.and_then(|s| Ulid::from_string(&s).ok()),
                    note_id: note_id_str.and_then(|s| Ulid::from_string(&s).ok()),
                    description: row.get(5)?,
                    started_at: row.get(6)?,
                    ended_at: row.get(7)?,
                    duration_seconds: row.get(8)?,
                    is_running: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    fn fetch_tasks(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<Vec<Task>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status,
                    due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area
             FROM task
             WHERE space_id = ?1 AND status != 'completed'",
        )?;

        let tasks = stmt
            .query_map([space_id.to_string()], |row| {
                let id_str: String = row.get(0)?;
                let space_id_str: String = row.get(1)?;
                let note_id_str: Option<String> = row.get(2)?;
                let project_id_str: Option<String> = row.get(3)?;
                let parent_task_id_str: Option<String> = row.get(4)?;

                Ok(Task {
                    id: Ulid::from_string(&id_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    space_id: Ulid::from_string(&space_id_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            1,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    note_id: note_id_str.and_then(|s| Ulid::from_string(&s).ok()),
                    project_id: project_id_str.and_then(|s| Ulid::from_string(&s).ok()),
                    parent_task_id: parent_task_id_str.and_then(|s| Ulid::from_string(&s).ok()),
                    title: row.get(5)?,
                    description: row.get(6)?,
                    status: row.get(7)?,
                    due_at: row.get(8)?,
                    start_at: row.get(9)?,
                    completed_at: row.get(10)?,
                    priority: row.get(11)?,
                    estimate_minutes: row.get(12)?,
                    recur_rule: row.get(13)?,
                    context: row.get(14)?,
                    area: row.get(15)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tasks)
    }

    fn fetch_transactions(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<Transaction>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, space_id, note_id, transaction_type, amount, currency, category, account, description, date, recurring, recurring_frequency, blob_id, created_at
             FROM transaction
             WHERE space_id = ?1 AND date >= ?2
             ORDER BY date DESC",
        )?;

        let transactions = stmt
            .query_map(params![space_id.to_string(), since], |row| {
                Ok(Transaction {
                    id: row.get(0)?,
                    space_id: row.get(1)?,
                    note_id: row.get(2)?,
                    transaction_type: row.get(3)?,
                    amount: row.get(4)?,
                    currency: row.get(5)?,
                    category: row.get(6)?,
                    account: row.get(7)?,
                    description: row.get(8)?,
                    date: row.get(9)?,
                    recurring: row.get(10)?,
                    recurring_frequency: row.get(11)?,
                    blob_id: row.get(12)?,
                    created_at: row.get(13)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(transactions)
    }
}

impl Default for CorrelationEngine {
    fn default() -> Self {
        Self::new()
    }
}

// ===== Personal Simulator: Predictive Modeling =====

/// Represents a hypothetical scenario for "what-if" analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    pub description: String,
    pub modifications: Vec<ScenarioModification>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScenarioModification {
    AddTask {
        title: String,
        estimated_hours: f64,
        deadline_days: i64,
        priority: String,
    },
    RemoveTask {
        task_id: String,
    },
    PauseProject {
        project_id: String,
    },
    AddCalendarEvent {
        title: String,
        duration_hours: f64,
        recurring_weekly: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioAnalysis {
    pub scenario_id: String,
    pub predicted_workload_hours: f64,
    pub available_hours: f64,
    pub burnout_risk: f64,  // 0.0 - 1.0
    pub deadline_risk: f64, // 0.0 - 1.0 (probability of missing deadlines)
    pub recommendations: Vec<String>,
    pub insights: Vec<Insight>,
}

impl CorrelationEngine {
    /// Simulate a scenario and predict outcomes
    pub fn simulate_scenario(
        &self,
        conn: &Connection,
        space_id: Ulid,
        scenario: &Scenario,
    ) -> Result<ScenarioAnalysis, CorrelationError> {
        // Gather current context
        let mut context = self.gather_context(conn, space_id, self.medium_term_days)?;

        // Apply scenario modifications
        for modification in &scenario.modifications {
            self.apply_modification(&mut context, modification)?;
        }

        // Calculate predicted metrics
        let predicted_workload = self.calculate_predicted_workload(&context);
        let available_hours = self.calculate_available_hours(&context);
        let burnout_risk = self.calculate_burnout_risk(&context, predicted_workload);
        let deadline_risk = self.calculate_deadline_risk(&context, available_hours);

        // Generate recommendations
        let recommendations = self.generate_scenario_recommendations(
            predicted_workload,
            available_hours,
            burnout_risk,
            deadline_risk,
        );

        // Generate insights
        let insights = self.generate_scenario_insights(
            &scenario,
            predicted_workload,
            available_hours,
            burnout_risk,
            deadline_risk,
        );

        Ok(ScenarioAnalysis {
            scenario_id: scenario.id.clone(),
            predicted_workload_hours: predicted_workload,
            available_hours,
            burnout_risk,
            deadline_risk,
            recommendations,
            insights,
        })
    }

    fn apply_modification(
        &self,
        context: &mut CorrelationContext,
        modification: &ScenarioModification,
    ) -> Result<(), CorrelationError> {
        match modification {
            ScenarioModification::AddTask {
                title,
                estimated_hours,
                deadline_days,
                priority,
            } => {
                let now = Utc::now().timestamp();
                let due_at = now + (deadline_days * 86400);

                // Convert priority string to i64: "high" = 1, "medium" = 2, "low" = 3
                let priority_value = match priority.as_str() {
                    "high" => Some(1),
                    "medium" => Some(2),
                    "low" => Some(3),
                    _ => None,
                };

                let task = Task {
                    id: Ulid::new(),
                    space_id: context.space_id,
                    note_id: None,
                    project_id: None,
                    parent_task_id: None,
                    title: title.clone(),
                    description: Some(format!("Simulated task - {} hours", estimated_hours)),
                    status: "todo".to_string(),
                    due_at: Some(due_at),
                    start_at: None,
                    completed_at: None,
                    priority: priority_value,
                    estimate_minutes: Some((estimated_hours * 60.0) as i64),
                    recur_rule: None,
                    context: None,
                    area: None,
                };

                context.tasks.push(task);
            }
            ScenarioModification::RemoveTask { task_id } => {
                // Parse task_id string to Ulid for comparison
                if let Ok(task_ulid) = task_id.parse::<Ulid>() {
                    context.tasks.retain(|t| t.id != task_ulid);
                }
            }
            ScenarioModification::PauseProject { project_id } => {
                // Parse project_id string to Ulid and remove all associated tasks
                if let Ok(project_ulid) = project_id.parse::<Ulid>() {
                    context.tasks.retain(|t| t.project_id != Some(project_ulid));
                }
            }
            ScenarioModification::AddCalendarEvent {
                title,
                duration_hours,
                recurring_weekly,
            } => {
                // Calculate time impact
                let weekly_hours = if *recurring_weekly {
                    duration_hours * 4.0 // Assume 4 weeks in a month
                } else {
                    *duration_hours
                };

                // Add a synthetic time entry to represent calendar commitment
                let now = Utc::now().timestamp();
                let duration_seconds = (weekly_hours * 3600.0) as i64;

                let time_entry = TimeEntry {
                    id: Ulid::new(),
                    space_id: context.space_id,
                    task_id: None,
                    project_id: None,
                    note_id: None,
                    description: Some(format!("Calendar: {}", title)),
                    started_at: now,
                    ended_at: Some(now + duration_seconds),
                    duration_seconds: Some(duration_seconds),
                    is_running: false,
                };

                context.time_entries.push(time_entry);
            }
        }

        Ok(())
    }

    fn calculate_predicted_workload(&self, context: &CorrelationContext) -> f64 {
        // Sum up estimated hours for all active tasks
        let mut total_hours = 0.0;

        // Calculate historical average task duration from completed tasks with time entries
        let mut completed_task_hours: Vec<f64> = Vec::new();
        let mut time_by_task: HashMap<Ulid, f64> = HashMap::new();

        // Build time tracking data per task
        for entry in &context.time_entries {
            if let Some(task_id) = &entry.task_id {
                let duration = if let Some(ended) = entry.ended_at {
                    (ended - entry.started_at) as f64 / 3600.0
                } else {
                    0.0
                };
                *time_by_task.entry(task_id.clone()).or_insert(0.0) += duration;
            }
        }

        // Collect completed task durations for historical average
        for (task_id, hours) in &time_by_task {
            if let Some(task) = context
                .tasks
                .iter()
                .find(|t| t.id == *task_id && t.completed_at.is_some())
            {
                completed_task_hours.push(*hours);
            }
        }

        // Calculate historical average, default to 10 hours if no history
        let historical_avg = if !completed_task_hours.is_empty() {
            completed_task_hours.iter().sum::<f64>() / completed_task_hours.len() as f64
        } else {
            10.0
        };

        for task in &context.tasks {
            // Use estimate_minutes if available, otherwise use historical average
            let estimated_hours = task
                .estimate_minutes
                .map(|m| m as f64 / 60.0)
                .unwrap_or(historical_avg);

            // Subtract time already logged for this task
            let logged_hours = time_by_task.get(&task.id).copied().unwrap_or(0.0);
            let remaining_hours = (estimated_hours - logged_hours).max(0.0);

            total_hours += remaining_hours;
        }

        total_hours
    }

    fn calculate_available_hours(&self, context: &CorrelationContext) -> f64 {
        // Calculate user's historical daily work capacity from time entries
        let time_window_days = (context.end_time - context.start_time) / 86400;

        // Calculate actual historical daily hours from completed time entries
        let total_work_hours: f64 = context
            .time_entries
            .iter()
            .filter(|e| {
                e.ended_at.is_some()
                    && !e
                        .description
                        .as_ref()
                        .map_or(false, |d| d.starts_with("Calendar:"))
            })
            .map(|e| (e.ended_at.unwrap() - e.started_at) as f64 / 3600.0)
            .sum();

        let days_in_history = ((context.end_time - context.start_time) as f64 / 86400.0).max(1.0);
        let avg_daily_hours = if total_work_hours > 0.0 {
            (total_work_hours / days_in_history).min(12.0) // Cap at 12 hours for sanity
        } else {
            8.0 // Default to 8 hours if no history
        };

        let theoretical_max = time_window_days as f64 * avg_daily_hours;

        // Subtract time already committed (calendar events, recurring meetings)
        let committed_hours: f64 = context
            .time_entries
            .iter()
            .filter(|e| {
                e.description
                    .as_ref()
                    .map_or(false, |d| d.starts_with("Calendar:"))
            })
            .map(|e| e.duration_seconds.unwrap_or(0) as f64 / 3600.0)
            .sum();

        (theoretical_max - committed_hours).max(0.0)
    }

    fn calculate_burnout_risk(&self, context: &CorrelationContext, workload: f64) -> f64 {
        // Calculate historical average weekly hours as personalized baseline
        let total_historical_hours: f64 = context
            .time_entries
            .iter()
            .filter(|e| e.ended_at.is_some())
            .map(|e| (e.ended_at.unwrap() - e.started_at) as f64 / 3600.0)
            .sum();

        let weeks_in_history = (self.medium_term_days as f64 / 7.0).max(1.0);
        let avg_weekly_hours = total_historical_hours / weeks_in_history;

        // Use personalized baseline, default to 40 hours if no history
        let baseline_hours = if avg_weekly_hours > 0.0 {
            avg_weekly_hours
        } else {
            40.0
        };

        // Check for low mood periods
        let low_mood_days = context
            .health_data
            .iter()
            .filter(|m| m.metric_type == "mood" && m.value <= 3.0)
            .count();

        // Calculate workload ratio against personalized baseline
        let workload_ratio = workload / baseline_hours;
        let mood_factor = low_mood_days as f64 / 30.0; // Normalize over 30 days

        ((workload_ratio * 0.6) + (mood_factor * 0.4)).min(1.0)
    }

    fn calculate_deadline_risk(&self, _context: &CorrelationContext, available: f64) -> f64 {
        // Simple heuristic: if workload > available hours, high risk
        let workload = self.calculate_predicted_workload(_context);
        if available <= 0.0 {
            return 1.0;
        }

        let ratio = workload / available;
        if ratio > 1.0 {
            ((ratio - 1.0) * 0.5 + 0.5).min(1.0)
        } else {
            0.0
        }
    }

    fn generate_scenario_recommendations(
        &self,
        workload: f64,
        available: f64,
        burnout_risk: f64,
        deadline_risk: f64,
    ) -> Vec<String> {
        let mut recommendations = Vec::new();

        if deadline_risk > 0.7 {
            recommendations.push(format!(
                "⚠️ High deadline risk ({:.0}%). Consider deferring {} hours of work.",
                deadline_risk * 100.0,
                (workload - available).max(0.0)
            ));
        }

        if burnout_risk > 0.8 {
            recommendations
                .push("🛑 Critical burnout risk. Schedule recovery time immediately.".to_string());
        } else if burnout_risk > 0.5 {
            recommendations
                .push("⚡ Moderate burnout risk. Plan lighter workweeks ahead.".to_string());
        }

        if workload < available * 0.5 {
            recommendations
                .push("✅ Workload is manageable. Consider taking on new projects.".to_string());
        }

        if recommendations.is_empty() {
            recommendations.push("✅ Scenario looks balanced and achievable.".to_string());
        }

        recommendations
    }

    fn generate_scenario_insights(
        &self,
        scenario: &Scenario,
        workload: f64,
        available: f64,
        burnout_risk: f64,
        deadline_risk: f64,
    ) -> Vec<Insight> {
        let mut insights = Vec::new();
        let now = Utc::now().timestamp();

        if deadline_risk > 0.5 {
            insights.push(Insight {
                id: Ulid::new().to_string(),
                insight_type: InsightType::MilestoneRisk,
                title: format!("Scenario '{}': High deadline risk", scenario.name),
                description: format!(
                    "This scenario requires {:.1} hours but you only have {:.1} hours available. Deadline miss probability: {:.0}%",
                    workload, available, deadline_risk * 100.0
                ),
                severity: if deadline_risk > 0.8 {
                    InsightSeverity::High
                } else {
                    InsightSeverity::Medium
                },
                context: InsightContext {
                    entity_id: Some(scenario.id.clone()),
                    entity_type: Some("scenario".to_string()),
                    metrics: serde_json::json!({
                        "workload_hours": workload,
                        "available_hours": available,
                        "deadline_risk": deadline_risk,
                    }),
                },
                suggested_actions: vec![
                    SuggestedAction {
                        action_type: "modify_scenario".to_string(),
                        label: "Reduce scope".to_string(),
                        description: "Remove or defer some tasks in this scenario".to_string(),
                        parameters: serde_json::json!({ "scenario_id": scenario.id }),
                    },
                ],
                created_at: now,
                dismissed: false,
            });
        }

        if burnout_risk > 0.7 {
            insights.push(Insight {
                id: Ulid::new().to_string(),
                insight_type: InsightType::MoodCorrelation,
                title: format!("Scenario '{}': Burnout risk", scenario.name),
                description: format!(
                    "This scenario has a {:.0}% burnout risk based on your historical patterns.",
                    burnout_risk * 100.0
                ),
                severity: if burnout_risk > 0.9 {
                    InsightSeverity::Critical
                } else {
                    InsightSeverity::High
                },
                context: InsightContext {
                    entity_id: Some(scenario.id.clone()),
                    entity_type: Some("scenario".to_string()),
                    metrics: serde_json::json!({
                        "burnout_risk": burnout_risk,
                    }),
                },
                suggested_actions: vec![SuggestedAction {
                    action_type: "add_recovery_time".to_string(),
                    label: "Add recovery blocks".to_string(),
                    description: "Schedule rest periods in this scenario".to_string(),
                    parameters: serde_json::json!({ "scenario_id": scenario.id }),
                }],
                created_at: now,
                dismissed: false,
            });
        }

        insights
    }
}
