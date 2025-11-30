//! Correlation Detectors
//!
//! Each detector analyzes specific cross-module relationships.

pub mod calendar_projects;
pub mod health_workload;
pub mod time_productivity;

pub use calendar_projects::detect as detect_calendar_projects;
pub use health_workload::detect as detect_health_workload;
pub use time_productivity::detect as detect_time_productivity;
