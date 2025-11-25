//! Foresight 2.0: Cross-Module Correlation Engine
//!
//! Analyzes relationships between data from different modules to generate
//! actionable, context-aware insights.
//!
//! ## Correlation Types
//!
//! - **Health × Workload**: Detect when mood/energy dips correlate with overwork
//! - **Finance × Tasks**: Link spending patterns to task priorities
//! - **Calendar × Projects**: Detect conflicts between external commitments and project work
//! - **Time × Productivity**: Identify when time spent doesn't match task progress

pub mod detectors;
pub mod types;
#[cfg(test)]
mod tests;

use rusqlite::Connection;
use std::time::Duration;
use ulid::Ulid;

pub use detectors::*;
pub use types::*;

/// Correlation Engine Configuration
#[derive(Debug, Clone)]
pub struct CorrelationConfig {
    /// Short-term analysis window (default: 7 days)
    pub short_term: Duration,
    /// Medium-term analysis window (default: 30 days)
    pub medium_term: Duration,
    /// Long-term analysis window (default: 90 days)
    pub long_term: Duration,
    /// Minimum correlation strength to report (0.0-1.0)
    pub min_strength_threshold: f64,
    /// Maximum number of insights to generate per category
    pub max_insights_per_category: usize,
}

impl Default for CorrelationConfig {
    fn default() -> Self {
        Self {
            short_term: Duration::from_secs(7 * 24 * 3600),      // 7 days
            medium_term: Duration::from_secs(30 * 24 * 3600),   // 30 days
            long_term: Duration::from_secs(90 * 24 * 3600),     // 90 days
            min_strength_threshold: 0.7,
            max_insights_per_category: 3,
        }
    }
}

/// The main Correlation Engine
pub struct CorrelationEngine {
    config: CorrelationConfig,
}

impl CorrelationEngine {
    /// Create a new correlation engine with default configuration
    pub fn new() -> Self {
        Self {
            config: CorrelationConfig::default(),
        }
    }

    /// Create with custom configuration
    pub fn with_config(config: CorrelationConfig) -> Self {
        Self { config }
    }

    /// Gather context from all data sources for a specific space
    pub fn gather_context(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<CorrelationContext, CorrelationError> {
        let now = chrono::Utc::now().timestamp();
        let window_start = now - self.config.medium_term.as_secs() as i64;

        log::info!(
            "[Correlation] Gathering context for space {} from {} to {}",
            space_id,
            window_start,
            now
        );

        // Gather health metrics
        let health_data = self.gather_health_data(conn, space_id, window_start)?;

        // Gather time entries
        let time_entries = self.gather_time_entries(conn, space_id, window_start)?;

        // Gather tasks
        let tasks = self.gather_tasks(conn, space_id)?;

        // Gather projects
        let projects = self.gather_projects(conn, space_id)?;

        // Gather calendar events
        let calendar_events = self.gather_calendar_events(conn, space_id, window_start, now)?;

        log::info!(
            "[Correlation] Context gathered: {} health, {} time, {} tasks, {} projects, {} events",
            health_data.len(),
            time_entries.len(),
            tasks.len(),
            projects.len(),
            calendar_events.len()
        );

        Ok(CorrelationContext {
            space_id,
            health_data,
            time_entries,
            tasks,
            projects,
            calendar_events,
            window_start,
            window_end: now,
        })
    }

    /// Analyze gathered context and return correlations
    pub fn analyze(&self, context: &CorrelationContext) -> Vec<Correlation> {
        let mut correlations = Vec::new();

        // Health × Workload correlation
        if let Some(correlation) = detectors::health_workload::detect(
            &context.health_data,
            &context.time_entries,
            &context.projects,
        ) {
            if correlation.strength >= self.config.min_strength_threshold {
                correlations.push(correlation);
            }
        }

        // Calendar × Projects correlation
        if let Some(correlation) = detectors::calendar_projects::detect(
            &context.calendar_events,
            &context.projects,
            &context.time_entries,
            &context.tasks,
        ) {
            if correlation.strength >= self.config.min_strength_threshold {
                correlations.push(correlation);
            }
        }

        // Time × Productivity correlation
        if let Some(correlation) = detectors::time_productivity::detect(
            &context.time_entries,
            &context.tasks,
        ) {
            if correlation.strength >= self.config.min_strength_threshold {
                correlations.push(correlation);
            }
        }

        // Sort by strength (highest first)
        correlations.sort_by(|a, b| {
            b.strength.partial_cmp(&a.strength).unwrap_or(std::cmp::Ordering::Equal)
        });

        log::info!(
            "[Correlation] Analysis complete: {} correlations found",
            correlations.len()
        );

        correlations
    }

    /// Convert correlations to actionable insights
    pub fn to_insights(&self, correlations: Vec<Correlation>) -> Vec<ActionableInsight> {
        correlations
            .into_iter()
            .filter_map(|c| self.correlation_to_insight(c))
            .collect()
    }

    fn correlation_to_insight(&self, correlation: Correlation) -> Option<ActionableInsight> {
        let (message, action) = match &correlation.pattern {
            CorrelationPattern::HealthWorkloadNegative { mood_avg, hours_logged } => {
                let msg = format!(
                    "Your mood has averaged {:.1}/10 while logging {:.0} hours. Consider taking a break.",
                    mood_avg, hours_logged
                );
                let action = SuggestedAction::BlockCalendarTime {
                    duration_minutes: 90,
                    reason: "Recovery time".to_string(),
                };
                (msg, action)
            }
            CorrelationPattern::CalendarProjectConflict { event_hours, project_name, available_hours } => {
                let msg = format!(
                    "You have {} hours of calendar events, but '{}' needs attention. Only {} hours available.",
                    event_hours, project_name, available_hours
                );
                let action = SuggestedAction::FindFocusBlocks {
                    project_id: correlation.entities.first().cloned().unwrap_or_default(),
                    hours_needed: 4,
                };
                (msg, action)
            }
            CorrelationPattern::TimeProductivityMismatch { task_name, hours_spent, progress_percent } => {
                let msg = format!(
                    "You've logged {} hours on '{}' but it's at {}% progress. May indicate blockers.",
                    hours_spent, task_name, progress_percent
                );
                let action = SuggestedAction::CreateTaskBreakdown {
                    task_id: correlation.entities.first().cloned().unwrap_or_default(),
                };
                (msg, action)
            }
            CorrelationPattern::Custom(description) => {
                (description.clone(), SuggestedAction::None)
            }
        };

        Some(ActionableInsight {
            id: ulid::Ulid::new().to_string(),
            correlation_type: correlation.correlation_type,
            message,
            suggested_action: action,
            confidence: correlation.strength,
            entities: correlation.entities,
            created_at: chrono::Utc::now().timestamp(),
        })
    }

    // Data gathering helpers
    fn gather_health_data(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<HealthMetricData>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, metric_type, value, recorded_at 
             FROM health_metric 
             WHERE space_id = ?1 AND recorded_at >= ?2
             ORDER BY recorded_at DESC"
        ).map_err(|e| CorrelationError::Database(e.to_string()))?;

        let metrics = stmt
            .query_map([space_id.to_string(), since.to_string()], |row| {
                Ok(HealthMetricData {
                    id: row.get(0)?,
                    metric_type: row.get(1)?,
                    value: row.get(2)?,
                    recorded_at: row.get(3)?,
                })
            })
            .map_err(|e| CorrelationError::Database(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(metrics)
    }

    fn gather_time_entries(
        &self,
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<TimeEntryData>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, task_id, duration_minutes, started_at
             FROM time_entry
             WHERE space_id = ?1 AND started_at >= ?2
             ORDER BY started_at DESC"
        ).map_err(|e| CorrelationError::Database(e.to_string()))?;

        let entries = stmt
            .query_map([space_id.to_string(), since.to_string()], |row| {
                Ok(TimeEntryData {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    task_id: row.get(2)?,
                    duration_minutes: row.get(3)?,
                    started_at: row.get(4)?,
                })
            })
            .map_err(|e| CorrelationError::Database(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(entries)
    }

    fn gather_tasks(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<Vec<TaskData>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, title, status, priority, due_date, project_id, progress
             FROM task
             WHERE space_id = ?1 AND status != 'completed'
             ORDER BY due_date ASC NULLS LAST"
        ).map_err(|e| CorrelationError::Database(e.to_string()))?;

        let tasks = stmt
            .query_map([space_id.to_string()], |row| {
                Ok(TaskData {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    status: row.get(2)?,
                    priority: row.get(3)?,
                    due_date: row.get(4)?,
                    project_id: row.get(5)?,
                    progress: row.get::<_, Option<i32>>(6)?.unwrap_or(0),
                })
            })
            .map_err(|e| CorrelationError::Database(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(tasks)
    }

    fn gather_projects(
        &self,
        conn: &Connection,
        space_id: Ulid,
    ) -> Result<Vec<ProjectData>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, name, status, priority
             FROM project
             WHERE space_id = ?1 AND status != 'completed'
             ORDER BY priority DESC"
        ).map_err(|e| CorrelationError::Database(e.to_string()))?;

        let projects = stmt
            .query_map([space_id.to_string()], |row| {
                Ok(ProjectData {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    status: row.get(2)?,
                    priority: row.get(3)?,
                })
            })
            .map_err(|e| CorrelationError::Database(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(projects)
    }

    fn gather_calendar_events(
        &self,
        conn: &Connection,
        space_id: Ulid,
        start: i64,
        end: i64,
    ) -> Result<Vec<CalendarEventData>, CorrelationError> {
        let mut stmt = conn.prepare(
            "SELECT id, summary, start_time, end_time
             FROM calendar_event
             WHERE space_id = ?1 AND start_time >= ?2 AND start_time <= ?3
             ORDER BY start_time ASC"
        ).map_err(|e| CorrelationError::Database(e.to_string()))?;

        let events = stmt
            .query_map([space_id.to_string(), start.to_string(), end.to_string()], |row| {
                Ok(CalendarEventData {
                    id: row.get(0)?,
                    summary: row.get(1)?,
                    start_time: row.get(2)?,
                    end_time: row.get(3)?,
                })
            })
            .map_err(|e| CorrelationError::Database(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(events)
    }
}

impl Default for CorrelationEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_defaults() {
        let config = CorrelationConfig::default();
        assert_eq!(config.short_term.as_secs(), 7 * 24 * 3600);
        assert!(config.min_strength_threshold >= 0.0);
        assert!(config.min_strength_threshold <= 1.0);
    }

    #[test]
    fn test_engine_creation() {
        let engine = CorrelationEngine::new();
        assert!(engine.config.min_strength_threshold > 0.0);
    }
}

