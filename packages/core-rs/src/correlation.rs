use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use ulid::Ulid;

use crate::foresight::{Insight, InsightContext, InsightSeverity, InsightType, SuggestedAction};
use crate::personal_modes::{HealthMetric, Transaction};
use crate::task::Task;
use crate::time_tracking::TimeEntry;

const MIN_LOW_MOOD_DAYS: usize = 3;
const MOOD_THRESHOLD: f64 = 3.0;
const OVERWORK_RATIO_THRESHOLD: f64 = 1.3;
const CORRELATION_STRONG_THRESHOLD: f64 = 0.7;

#[derive(Error, Debug)]
pub enum CorrelationError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Analysis error: {0}")]
    Analysis(String),
}

pub type CorrelationStrength = f64;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CorrelationType {
    HealthWorkload,
}

#[derive(Debug, Clone)]
pub struct Correlation {
    pub correlation_type: CorrelationType,
    pub strength: CorrelationStrength,
    pub entities: Vec<String>,
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

pub struct CorrelationEngine;

impl CorrelationEngine {
    pub fn new() -> Self {
        Self {}
    }

    pub fn gather_context(
        &self,
        conn: &Connection,
        space_id: Ulid,
        time_window_days: i64,
    ) -> Result<CorrelationContext, CorrelationError> {
        let now = Utc::now().timestamp();
        let start_time = now - (time_window_days * 86400);

        let health_data = self.fetch_health_metrics(conn, &space_id.to_string(), start_time)?;
        let time_entries = self.fetch_time_entries(conn, &space_id.to_string(), start_time)?;
        let tasks = self.fetch_tasks(conn, space_id)?;
        let transactions = self.fetch_transactions(conn, &space_id.to_string(), start_time)?;

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

    pub fn analyze(&self, context: &CorrelationContext) -> Vec<Correlation> {
        let mut correlations = Vec::new();
        if let Some(corr) = self.detect_health_workload(context) {
            correlations.push(corr);
        }
        correlations
    }

    pub fn correlations_to_insights(&self, correlations: Vec<Correlation>) -> Vec<Insight> {
        correlations
            .into_iter()
            .filter(|c| c.strength >= CORRELATION_STRONG_THRESHOLD)
            .filter_map(|c| self.correlation_to_insight(c))
            .collect()
    }

    fn detect_health_workload(&self, context: &CorrelationContext) -> Option<Correlation> {
        let low_mood_days: Vec<i64> = context
            .health_data
            .iter()
            .filter(|m| m.metric_type == "mood" && m.value <= MOOD_THRESHOLD)
            .map(|m| m.recorded_at / 86400)
            .collect();

        if low_mood_days.len() < MIN_LOW_MOOD_DAYS {
            return None;
        }
        let low_mood_start = *low_mood_days.iter().min()?;
        let low_mood_end = *low_mood_days.iter().max()?;

        let work_hours: f64 = context
            .time_entries
            .iter()
            .filter(|e| {
                (e.started_at / 86400) >= low_mood_start
                    && (e.started_at / 86400) <= low_mood_end
                    && e.ended_at.is_some()
            })
            .map(|e| (e.ended_at.unwrap() - e.started_at) as f64 / 3600.0)
            .sum();

        let num_days = (low_mood_end - low_mood_start + 1) as f64;
        if num_days == 0.0 {
            return None;
        }
        let expected_hours = num_days * 8.0;
        let overwork_ratio = work_hours / expected_hours;

        if overwork_ratio > OVERWORK_RATIO_THRESHOLD {
            Some(Correlation {
                correlation_type: CorrelationType::HealthWorkload,
                strength: (overwork_ratio - 1.0).min(1.0),
                entities: vec![],
                pattern_description: "Low mood correlates with high workload.".to_string(),
                metadata: [
                    (
                        "low_mood_days".to_string(),
                        serde_json::json!(low_mood_days.len()),
                    ),
                    ("work_hours".to_string(), serde_json::json!(work_hours)),
                    (
                        "overwork_ratio".to_string(),
                        serde_json::json!(overwork_ratio),
                    ),
                ]
                .iter()
                .cloned()
                .collect(),
            })
        } else {
            None
        }
    }

    fn correlation_to_insight(&self, correlation: Correlation) -> Option<Insight> {
        let now = Utc::now().timestamp();
        match correlation.correlation_type {
            CorrelationType::HealthWorkload => {
                let work_hours = correlation.metadata.get("work_hours")?.as_f64()?;
                let low_mood_days = correlation.metadata.get("low_mood_days")?.as_u64()?;
                Some(Insight {
                    id: Ulid::new().to_string(),
                    insight_type: InsightType::HighWorkload,
                    title: "Workload may be affecting well-being".to_string(),
                    description: format!(
                        "Your mood has been low for {} days, coinciding with {:.1} hours of work.",
                        low_mood_days, work_hours
                    ),
                    severity: InsightSeverity::Medium,
                    context: InsightContext {
                        entity_id: None,
                        entity_type: Some("workload".to_string()),
                        metrics: serde_json::json!({ "work_hours": work_hours, "low_mood_days": low_mood_days }),
                    },
                    suggested_actions: vec![SuggestedAction {
                        action_type: "schedule_recovery".to_string(),
                        label: "Block recovery time".to_string(),
                        parameters: serde_json::json!({ "duration_minutes": 90 }),
                    }],
                    created_at: now,
                    dismissed: false,
                })
            }
        }
    }

    // FINALIZED: Functions match the now-corrected signatures in other modules.
    fn fetch_health_metrics(
        &self,
        conn: &Connection,
        space_id: &str,
        since: i64,
    ) -> Result<Vec<HealthMetric>, CorrelationError> {
        crate::personal_modes::get_health_metrics_since(conn, space_id, since)
            .map_err(|e| CorrelationError::Analysis(e.to_string()))
    }

    fn fetch_time_entries(
        &self,
        conn: &Connection,
        space_id: &str,
        since: i64,
    ) -> Result<Vec<TimeEntry>, CorrelationError> {
        crate::time_tracking::get_time_entries_since(conn, space_id, since)
            .map_err(|e| CorrelationError::Analysis(e.to_string()))
    }

    fn fetch_tasks(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<Vec<Task>, CorrelationError> {
        crate::task::get_all_tasks_in_space(conn, space_id)
            .map_err(|e| CorrelationError::Analysis(e.to_string()))
    }

    fn fetch_transactions(
        &self,
        conn: &Connection,
        space_id: &str,
        since: i64,
    ) -> Result<Vec<Transaction>, CorrelationError> {
        crate::personal_modes::get_transactions_since(conn, space_id, since)
            .map_err(|e| CorrelationError::Analysis(e.to_string()))
    }
}
