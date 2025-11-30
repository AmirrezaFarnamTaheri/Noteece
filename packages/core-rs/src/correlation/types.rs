//! Correlation Engine Types
//!
//! Data structures for cross-module correlation analysis.

use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

/// Correlation-related errors
#[derive(Error, Debug)]
pub enum CorrelationError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Insufficient data for correlation")]
    InsufficientData,

    #[error("Analysis error: {0}")]
    AnalysisError(String),
}

/// Context gathered from all data sources
#[derive(Debug, Clone)]
pub struct CorrelationContext {
    pub space_id: Ulid,
    pub health_data: Vec<HealthMetricData>,
    pub time_entries: Vec<TimeEntryData>,
    pub tasks: Vec<TaskData>,
    pub projects: Vec<ProjectData>,
    pub calendar_events: Vec<CalendarEventData>,
    pub window_start: i64,
    pub window_end: i64,
}

/// Health metric data point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetricData {
    pub id: String,
    pub metric_type: String,
    pub value: f64,
    pub recorded_at: i64,
}

/// Time tracking entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeEntryData {
    pub id: String,
    pub project_id: Option<String>,
    pub task_id: Option<String>,
    pub duration_minutes: i64,
    pub started_at: i64,
}

/// Task data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskData {
    pub id: String,
    pub title: String,
    pub status: String,
    pub priority: i32,
    pub due_date: Option<i64>,
    pub project_id: Option<String>,
    pub progress: i32,
}

/// Project data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub id: String,
    pub name: String,
    pub status: String,
    pub priority: i32,
}

/// Calendar event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarEventData {
    pub id: String,
    pub summary: String,
    pub start_time: i64,
    pub end_time: i64,
}

/// Types of correlations that can be detected
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CorrelationType {
    /// Health metrics correlate with work hours
    HealthWorkload,
    /// Spending patterns affect task priorities
    FinanceTasks,
    /// Calendar events conflict with project work
    CalendarProjects,
    /// Time spent doesn't match task progress
    TimeProductivity,
    /// Custom correlation type
    Custom(String),
}

/// Pattern detected in the correlation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CorrelationPattern {
    /// Negative health-workload correlation
    HealthWorkloadNegative { mood_avg: f64, hours_logged: f64 },
    /// Calendar events conflict with project deadlines
    CalendarProjectConflict {
        event_hours: f64,
        project_name: String,
        available_hours: f64,
    },
    /// Time logged doesn't match task progress
    TimeProductivityMismatch {
        task_name: String,
        hours_spent: f64,
        progress_percent: i32,
    },
    /// Custom pattern
    Custom(String),
}

/// A detected correlation between data sources
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Correlation {
    /// Type of correlation
    pub correlation_type: CorrelationType,
    /// Strength of correlation (0.0 - 1.0)
    pub strength: f64,
    /// IDs of correlated entities
    pub entities: Vec<String>,
    /// Detected pattern
    pub pattern: CorrelationPattern,
    /// When the correlation was detected
    pub detected_at: i64,
}

impl Correlation {
    /// Create a new correlation
    pub fn new(
        correlation_type: CorrelationType,
        strength: f64,
        entities: Vec<String>,
        pattern: CorrelationPattern,
    ) -> Self {
        Self {
            correlation_type,
            strength: strength.clamp(0.0, 1.0),
            entities,
            pattern,
            detected_at: chrono::Utc::now().timestamp(),
        }
    }
}

/// Suggested action to take based on correlation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SuggestedAction {
    /// Block time on calendar
    BlockCalendarTime {
        duration_minutes: i64,
        reason: String,
    },
    /// Find focus blocks for a project
    FindFocusBlocks {
        project_id: String,
        hours_needed: i64,
    },
    /// Snooze a task until later
    SnoozeTask { task_id: String, until: i64 },
    /// Create breakdown for a blocked task
    CreateTaskBreakdown { task_id: String },
    /// Adjust project priority
    AdjustProjectPriority {
        project_id: String,
        new_priority: i32,
    },
    /// No action suggested
    None,
}

/// An actionable insight generated from correlation analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionableInsight {
    /// Unique identifier
    pub id: String,
    /// Type of underlying correlation
    pub correlation_type: CorrelationType,
    /// Human-readable message
    pub message: String,
    /// Suggested action
    pub suggested_action: SuggestedAction,
    /// Confidence level (0.0 - 1.0)
    pub confidence: f64,
    /// Related entity IDs
    pub entities: Vec<String>,
    /// When this insight was created
    pub created_at: i64,
}

/// Outcome of a user's response to a suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SuggestionOutcome {
    /// User accepted the suggestion
    Accepted,
    /// User rejected the suggestion
    Rejected { reason: Option<String> },
    /// User modified the suggestion
    Modified { changes: Vec<String> },
    /// User dismissed without action
    Dismissed,
}

/// Record of a suggestion and its outcome (for learning)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestionRecord {
    pub insight_id: String,
    pub outcome: SuggestionOutcome,
    pub recorded_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_correlation_strength_clamping() {
        let correlation = Correlation::new(
            CorrelationType::HealthWorkload,
            1.5, // Over 1.0
            vec![],
            CorrelationPattern::Custom("test".to_string()),
        );
        assert_eq!(correlation.strength, 1.0);

        let correlation = Correlation::new(
            CorrelationType::HealthWorkload,
            -0.5, // Under 0.0
            vec![],
            CorrelationPattern::Custom("test".to_string()),
        );
        assert_eq!(correlation.strength, 0.0);
    }

    #[test]
    fn test_correlation_types() {
        let ct = CorrelationType::HealthWorkload;
        assert_eq!(ct, CorrelationType::HealthWorkload);

        let custom = CorrelationType::Custom("custom".to_string());
        assert!(matches!(custom, CorrelationType::Custom(_)));
    }
}
