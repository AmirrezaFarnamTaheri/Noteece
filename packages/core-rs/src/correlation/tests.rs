//! Correlation Engine Tests

#[cfg(test)]
mod tests {
    use super::super::*;
    use super::super::types::*;

    fn make_health(metric_type: &str, value: f64, recorded_at: i64) -> HealthMetricData {
        HealthMetricData {
            id: ulid::Ulid::new().to_string(),
            metric_type: metric_type.to_string(),
            value,
            recorded_at,
        }
    }

    fn make_time(duration_minutes: i64, project_id: Option<&str>, task_id: Option<&str>) -> TimeEntryData {
        TimeEntryData {
            id: ulid::Ulid::new().to_string(),
            project_id: project_id.map(String::from),
            task_id: task_id.map(String::from),
            duration_minutes,
            started_at: chrono::Utc::now().timestamp(),
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

    fn make_task(title: &str, progress: i32, project_id: Option<&str>) -> TaskData {
        TaskData {
            id: ulid::Ulid::new().to_string(),
            title: title.to_string(),
            status: "in_progress".to_string(),
            priority: 3,
            due_date: None,
            project_id: project_id.map(String::from),
            progress,
        }
    }

    fn make_event(hours: f64) -> CalendarEventData {
        let now = chrono::Utc::now().timestamp();
        CalendarEventData {
            id: ulid::Ulid::new().to_string(),
            summary: "Meeting".to_string(),
            start_time: now,
            end_time: now + (hours * 3600.0) as i64,
        }
    }

    #[test]
    fn test_engine_creation() {
        let engine = CorrelationEngine::new();
        assert!(engine.config.min_strength_threshold > 0.0);
        assert!(engine.config.min_strength_threshold <= 1.0);
    }

    #[test]
    fn test_config_custom() {
        let config = CorrelationConfig {
            short_term: std::time::Duration::from_secs(3 * 24 * 3600),
            medium_term: std::time::Duration::from_secs(14 * 24 * 3600),
            long_term: std::time::Duration::from_secs(60 * 24 * 3600),
            min_strength_threshold: 0.8,
            max_insights_per_category: 5,
        };
        let engine = CorrelationEngine::with_config(config);
        assert_eq!(engine.config.min_strength_threshold, 0.8);
    }

    #[test]
    fn test_correlation_creation() {
        let correlation = Correlation::new(
            CorrelationType::HealthWorkload,
            0.85,
            vec!["project1".to_string()],
            CorrelationPattern::HealthWorkloadNegative {
                mood_avg: 3.5,
                hours_logged: 60.0,
            },
        );
        assert_eq!(correlation.strength, 0.85);
        assert!(matches!(correlation.correlation_type, CorrelationType::HealthWorkload));
    }

    #[test]
    fn test_correlation_strength_clamping() {
        let high = Correlation::new(
            CorrelationType::HealthWorkload,
            1.5,
            vec![],
            CorrelationPattern::Custom("test".to_string()),
        );
        assert_eq!(high.strength, 1.0);

        let low = Correlation::new(
            CorrelationType::HealthWorkload,
            -0.5,
            vec![],
            CorrelationPattern::Custom("test".to_string()),
        );
        assert_eq!(low.strength, 0.0);
    }

    #[test]
    fn test_analyze_empty_context() {
        let engine = CorrelationEngine::new();
        let context = CorrelationContext {
            space_id: ulid::Ulid::new(),
            health_data: vec![],
            time_entries: vec![],
            tasks: vec![],
            projects: vec![],
            calendar_events: vec![],
            window_start: 0,
            window_end: chrono::Utc::now().timestamp(),
        };
        let correlations = engine.analyze(&context);
        assert!(correlations.is_empty());
    }

    #[test]
    fn test_actionable_insight_creation() {
        let insight = ActionableInsight {
            id: "test".to_string(),
            correlation_type: CorrelationType::TimeProductivity,
            message: "Test insight".to_string(),
            suggested_action: SuggestedAction::CreateTaskBreakdown {
                task_id: "task1".to_string(),
            },
            confidence: 0.9,
            entities: vec!["task1".to_string()],
            created_at: chrono::Utc::now().timestamp(),
        };
        assert_eq!(insight.confidence, 0.9);
    }

    #[test]
    fn test_suggested_action_variants() {
        let actions = vec![
            SuggestedAction::BlockCalendarTime {
                duration_minutes: 60,
                reason: "Focus time".to_string(),
            },
            SuggestedAction::FindFocusBlocks {
                project_id: "p1".to_string(),
                hours_needed: 4,
            },
            SuggestedAction::SnoozeTask {
                task_id: "t1".to_string(),
                until: chrono::Utc::now().timestamp() + 86400,
            },
            SuggestedAction::CreateTaskBreakdown {
                task_id: "t2".to_string(),
            },
            SuggestedAction::AdjustProjectPriority {
                project_id: "p2".to_string(),
                new_priority: 5,
            },
            SuggestedAction::None,
        ];
        assert_eq!(actions.len(), 6);
    }

    #[test]
    fn test_suggestion_outcome_variants() {
        let outcomes = vec![
            SuggestionOutcome::Accepted,
            SuggestionOutcome::Rejected { reason: Some("Not useful".to_string()) },
            SuggestionOutcome::Modified { changes: vec!["Changed duration".to_string()] },
            SuggestionOutcome::Dismissed,
        ];
        assert_eq!(outcomes.len(), 4);
    }

    #[test]
    fn test_health_workload_detection() {
        let now = chrono::Utc::now().timestamp();
        let health = vec![
            make_health("mood", 3.0, now),
            make_health("mood", 4.0, now - 86400),
            make_health("mood", 3.5, now - 172800),
        ];

        // 70 hours in a week = 10 hours/day
        let time_entries = vec![
            make_time(600, Some("proj1"), None),
            make_time(600, Some("proj1"), None),
            make_time(600, Some("proj1"), None),
            make_time(600, Some("proj1"), None),
            make_time(600, Some("proj1"), None),
            make_time(600, Some("proj1"), None),
            make_time(600, Some("proj1"), None),
        ];

        let result = detectors::health_workload::detect(&health, &time_entries, &[]);
        assert!(result.is_some());
    }

    #[test]
    fn test_time_productivity_detection() {
        let task = make_task("Refactor API", 10, None);
        let time_entries = vec![make_time(720, None, Some(&task.id))]; // 12 hours

        let result = detectors::time_productivity::detect(&time_entries, &[task]);
        assert!(result.is_some());
    }

    #[test]
    fn test_calendar_project_detection() {
        let project = make_project("Project Alpha", 5);
        let events: Vec<_> = (0..10).map(|_| make_event(3.0)).collect();
        let time_entries: Vec<_> = (0..4).map(|_| make_time(600, Some(&project.id), None)).collect();

        let result = detectors::calendar_projects::detect(&events, &[project], &time_entries, &[]);
        assert!(result.is_some());
    }
}

