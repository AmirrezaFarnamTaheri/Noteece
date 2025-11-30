//! Calendar × Projects Correlation Detector
//!
//! Detects when external calendar commitments conflict with project work.

use crate::correlation::types::*;

/// Detect calendar-project conflicts
///
/// Analyzes the relationship between calendar events and project deadlines/work time
/// to identify when external commitments may impact project progress.
pub fn detect(
    calendar_events: &[CalendarEventData],
    projects: &[ProjectData],
    time_entries: &[TimeEntryData],
    _tasks: &[TaskData],
) -> Option<Correlation> {
    if projects.is_empty() || (calendar_events.is_empty() && time_entries.is_empty()) {
        return None;
    }

    // Calculate total calendar hours this week
    let event_hours: f64 = calendar_events
        .iter()
        .map(|e| (e.end_time - e.start_time) as f64 / 3600.0)
        .sum();

    // Find high-priority projects with upcoming tasks
    let urgent_projects: Vec<&ProjectData> = projects
        .iter()
        .filter(|p| p.priority >= 3) // High priority
        .collect();

    if urgent_projects.is_empty() {
        return None;
    }

    // Calculate average hours per project from time entries
    let hours_per_project: std::collections::HashMap<String, f64> = {
        let mut map = std::collections::HashMap::new();
        for entry in time_entries {
            if let Some(ref project_id) = entry.project_id {
                *map.entry(project_id.clone()).or_insert(0.0) +=
                    entry.duration_minutes as f64 / 60.0;
            }
        }
        map
    };

    // Assume 40 working hours per week
    let total_working_hours = 40.0;
    let available_hours = total_working_hours - event_hours;

    // Check for conflicts
    for project in &urgent_projects {
        let project_hours = hours_per_project.get(&project.id).copied().unwrap_or(0.0);
        let project_avg_weekly = project_hours / 4.0; // Assume 4 weeks of data

        // If available hours are significantly less than what project typically needs
        if available_hours < project_avg_weekly * 0.8 && event_hours > 15.0 {
            let strength = ((event_hours - 15.0) / 25.0).min(1.0); // 15-40 hours = 0-1

            log::info!(
                "[Correlation] Calendar-Project conflict: {} has {} event hours, '{}' needs ~{:.1} hours/week",
                event_hours, project.name, project_avg_weekly, available_hours
            );

            return Some(Correlation::new(
                CorrelationType::CalendarProjects,
                strength,
                vec![project.id.clone()],
                CorrelationPattern::CalendarProjectConflict {
                    event_hours,
                    project_name: project.name.clone(),
                    available_hours,
                },
            ));
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_event(hours: f64) -> CalendarEventData {
        let now = chrono::Utc::now().timestamp();
        CalendarEventData {
            id: ulid::Ulid::new().to_string(),
            summary: "Meeting".to_string(),
            start_time: now,
            end_time: now + (hours * 3600.0) as i64,
        }
    }

    fn make_project(name: &str, priority: i32) -> ProjectData {
        ProjectData {
            id: ulid::Ulid::new().to_string(),
            name: name.to_string(),
            status: "active".to_string(),
            priority,
        }
    }

    fn make_time(project_id: &str, hours: f64) -> TimeEntryData {
        TimeEntryData {
            id: ulid::Ulid::new().to_string(),
            project_id: Some(project_id.to_string()),
            task_id: None,
            duration_minutes: (hours * 60.0) as i64,
            started_at: chrono::Utc::now().timestamp(),
        }
    }

    #[test]
    fn test_no_conflict_few_events() {
        let project = make_project("Project A", 5);
        let events = vec![make_event(2.0), make_event(2.0)]; // 4 hours
        let time_entries = vec![make_time(&project.id, 10.0)];

        let result = detect(&events, &[project], &time_entries, &[]);
        assert!(result.is_none());
    }

    #[test]
    fn test_detects_conflict_many_events() {
        let project = make_project("Project A", 5);
        let events: Vec<_> = (0..10).map(|_| make_event(3.0)).collect(); // 30 hours
        let time_entries: Vec<_> = (0..4).map(|_| make_time(&project.id, 10.0)).collect();

        let result = detect(&events, &[project], &time_entries, &[]);
        assert!(result.is_some());

        let correlation = result.unwrap();
        assert_eq!(
            correlation.correlation_type,
            CorrelationType::CalendarProjects
        );
    }
}
