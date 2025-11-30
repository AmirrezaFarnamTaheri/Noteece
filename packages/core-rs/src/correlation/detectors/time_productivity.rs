//! Time × Productivity Correlation Detector
//!
//! Identifies when time spent doesn't match task progress.

use crate::correlation::types::*;

/// Detect time-productivity mismatches
///
/// Analyzes the relationship between logged time and task progress
/// to identify tasks that may have blockers or need breakdown.
pub fn detect(time_entries: &[TimeEntryData], tasks: &[TaskData]) -> Option<Correlation> {
    if time_entries.is_empty() || tasks.is_empty() {
        return None;
    }

    // Calculate time per task
    let mut time_per_task: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    for entry in time_entries {
        if let Some(ref task_id) = entry.task_id {
            *time_per_task.entry(task_id.clone()).or_insert(0.0) +=
                entry.duration_minutes as f64 / 60.0;
        }
    }

    // Find tasks with significant time but low progress
    for task in tasks {
        if let Some(&hours) = time_per_task.get(&task.id) {
            // Check for mismatch: lots of time (>6 hours) but low progress (<30%)
            let progress = task.progress;

            if hours > 6.0 && progress < 30 {
                // Calculate strength based on severity of mismatch
                let expected_progress = (hours / 20.0 * 100.0).min(100.0) as i32; // Assume 20 hours for 100%
                let progress_gap = expected_progress.saturating_sub(progress);
                let strength = (progress_gap as f64 / 50.0).min(1.0);

                if strength > 0.5 {
                    log::info!(
                        "[Correlation] Time-Productivity mismatch: '{}' has {} hours, {}% progress",
                        task.title,
                        hours,
                        progress
                    );

                    return Some(Correlation::new(
                        CorrelationType::TimeProductivity,
                        strength,
                        vec![task.id.clone()],
                        CorrelationPattern::TimeProductivityMismatch {
                            task_name: task.title.clone(),
                            hours_spent: hours,
                            progress_percent: progress,
                        },
                    ));
                }
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_task(title: &str, progress: i32) -> TaskData {
        TaskData {
            id: ulid::Ulid::new().to_string(),
            title: title.to_string(),
            status: "in_progress".to_string(),
            priority: 3,
            due_date: None,
            project_id: None,
            progress,
        }
    }

    fn make_time(task_id: &str, hours: f64) -> TimeEntryData {
        TimeEntryData {
            id: ulid::Ulid::new().to_string(),
            project_id: None,
            task_id: Some(task_id.to_string()),
            duration_minutes: (hours * 60.0) as i64,
            started_at: chrono::Utc::now().timestamp(),
        }
    }

    #[test]
    fn test_no_mismatch_proportional() {
        let task = make_task("Task A", 50);
        let time_entries = vec![make_time(&task.id, 10.0)]; // 10 hours, 50% progress = OK

        let result = detect(&time_entries, &[task]);
        assert!(result.is_none());
    }

    #[test]
    fn test_detects_mismatch() {
        let task = make_task("Task A", 10); // Only 10% progress
        let time_entries = vec![make_time(&task.id, 12.0)]; // 12 hours logged

        let result = detect(&time_entries, &[task]);
        assert!(result.is_some());

        let correlation = result.unwrap();
        assert_eq!(
            correlation.correlation_type,
            CorrelationType::TimeProductivity
        );
    }

    #[test]
    fn test_no_mismatch_low_time() {
        let task = make_task("Task A", 5); // Low progress
        let time_entries = vec![make_time(&task.id, 2.0)]; // But only 2 hours

        let result = detect(&time_entries, &[task]);
        assert!(result.is_none()); // Not enough time to indicate a problem
    }
}
