//! Health × Workload Correlation Detector
//!
//! Detects when mood/energy dips correlate with overwork.

use crate::correlation::types::*;

/// Detect health-workload correlations
///
/// Analyzes the relationship between health metrics (especially mood/energy)
/// and logged work hours to identify potential burnout patterns.
pub fn detect(
    health_data: &[HealthMetricData],
    time_entries: &[TimeEntryData],
    projects: &[ProjectData],
) -> Option<Correlation> {
    // Need minimum data for meaningful analysis
    if health_data.len() < 3 || time_entries.is_empty() {
        return None;
    }

    // Calculate average mood (assuming mood metrics)
    let mood_metrics: Vec<&HealthMetricData> = health_data
        .iter()
        .filter(|h| h.metric_type == "mood" || h.metric_type == "energy")
        .collect();

    if mood_metrics.is_empty() {
        return None;
    }

    let mood_avg: f64 = mood_metrics.iter().map(|m| m.value).sum::<f64>() / mood_metrics.len() as f64;

    // Calculate total hours logged in the period
    let total_minutes: i64 = time_entries.iter().map(|t| t.duration_minutes).sum();
    let total_hours = total_minutes as f64 / 60.0;

    // Calculate hours per day (assuming 7-day window)
    let hours_per_day = total_hours / 7.0;

    // Detect negative correlation: low mood + high workload
    let is_overworked = hours_per_day > 8.0; // More than 8 hours per day average
    let is_low_mood = mood_avg < 5.0; // Below midpoint on 1-10 scale

    if is_overworked && is_low_mood {
        // Calculate correlation strength based on deviation from healthy baselines
        let workload_excess = (hours_per_day - 8.0).max(0.0) / 4.0; // 0-1 scale for 8-12 hours
        let mood_deficit = (5.0 - mood_avg).max(0.0) / 5.0; // 0-1 scale for mood 0-5
        let strength = ((workload_excess + mood_deficit) / 2.0).min(1.0);

        // Collect related project IDs
        let project_ids: Vec<String> = time_entries
            .iter()
            .filter_map(|t| t.project_id.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        log::info!(
            "[Correlation] Health-Workload detected: mood_avg={:.1}, hours/day={:.1}, strength={:.2}",
            mood_avg, hours_per_day, strength
        );

        return Some(Correlation::new(
            CorrelationType::HealthWorkload,
            strength,
            project_ids,
            CorrelationPattern::HealthWorkloadNegative {
                mood_avg,
                hours_logged: total_hours,
            },
        ));
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_health(metric_type: &str, value: f64, recorded_at: i64) -> HealthMetricData {
        HealthMetricData {
            id: ulid::Ulid::new().to_string(),
            metric_type: metric_type.to_string(),
            value,
            recorded_at,
        }
    }

    fn make_time(duration_minutes: i64, project_id: Option<&str>) -> TimeEntryData {
        TimeEntryData {
            id: ulid::Ulid::new().to_string(),
            project_id: project_id.map(String::from),
            task_id: None,
            duration_minutes,
            started_at: chrono::Utc::now().timestamp(),
        }
    }

    #[test]
    fn test_no_correlation_insufficient_data() {
        let result = detect(&[], &[], &[]);
        assert!(result.is_none());
    }

    #[test]
    fn test_detects_overwork_low_mood() {
        let now = chrono::Utc::now().timestamp();
        let health = vec![
            make_health("mood", 3.0, now),
            make_health("mood", 4.0, now - 86400),
            make_health("mood", 3.5, now - 172800),
        ];

        // 70 hours in a week = 10 hours/day
        let time_entries = vec![
            make_time(600, Some("proj1")), // 10 hours
            make_time(600, Some("proj1")),
            make_time(600, Some("proj1")),
            make_time(600, Some("proj1")),
            make_time(600, Some("proj1")),
            make_time(600, Some("proj1")),
            make_time(600, Some("proj1")),
        ];

        let result = detect(&health, &time_entries, &[]);
        assert!(result.is_some());

        let correlation = result.unwrap();
        assert_eq!(correlation.correlation_type, CorrelationType::HealthWorkload);
        assert!(correlation.strength > 0.0);
    }

    #[test]
    fn test_no_correlation_healthy_balance() {
        let now = chrono::Utc::now().timestamp();
        let health = vec![
            make_health("mood", 8.0, now),
            make_health("mood", 7.5, now - 86400),
            make_health("mood", 8.0, now - 172800),
        ];

        // 40 hours in a week = 6 hours/day (under threshold)
        let time_entries = vec![
            make_time(343, Some("proj1")), // ~5.7 hours/day
            make_time(343, Some("proj1")),
            make_time(343, Some("proj1")),
            make_time(343, Some("proj1")),
            make_time(343, Some("proj1")),
            make_time(343, Some("proj1")),
            make_time(343, Some("proj1")),
        ];

        let result = detect(&health, &time_entries, &[]);
        assert!(result.is_none()); // No correlation - healthy state
    }
}

