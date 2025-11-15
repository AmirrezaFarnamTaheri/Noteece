# Foresight 2.0: Cross-Module Correlation Architecture

## Overview

Foresight 2.0 transforms the insights engine from a passive dashboard into a **proactive cognitive assistant** that correlates data across all Noteece modules to generate actionable, context-aware insights.

## Core Concepts

### 1. Correlation Engine

The correlation engine analyzes relationships between data from different modules:

```rust
pub struct CorrelationEngine {
    // Time windows for analysis
    short_term: Duration,   // 7 days
    medium_term: Duration,  // 30 days
    long_term: Duration,    // 90 days
}
```

### 2. Cross-Module Data Sources

```rust
pub enum DataSource {
    Health(HealthMetric),
    TimeTracking(TimeEntry),
    Task(Task),
    Project(Project),
    CalDAV(CalendarEvent),
    Finance(Transaction),
}

pub struct CorrelationContext {
    pub health_data: Vec<HealthMetric>,
    pub time_entries: Vec<TimeEntry>,
    pub tasks: Vec<Task>,
    pub projects: Vec<Project>,
    pub calendar_events: Vec<CalendarEvent>,
    pub transactions: Vec<Transaction>,
}
```

### 3. Correlation Types

#### A. Health × Workload Correlation

Detect when mood/energy dips correlate with overwork:

```rust
pub fn correlate_health_workload(
    conn: &Connection,
    space_id: Ulid,
    time_window: i64
) -> Result<Vec<Insight>, ForesightError>
```

**Example Insight:**

> "Your mood has been 'low' for 3 days. During this period, you logged 36 hours on [[Project Phoenix]]. Your calendar shows no breaks scheduled. **Shall I block 90 minutes of recovery time tomorrow morning?**"

#### B. Finance × Task Correlation

Link spending patterns to task priorities:

```rust
pub fn correlate_finance_tasks(
    conn: &Connection,
    space_id: Ulid
) -> Result<Vec<Insight>, ForesightError>
```

**Example Insight:**

> "Your 'Discretionary' budget is at 15% remaining, but you have a task 'Buy new headphones' tagged #shopping. **Shall I snooze this task until next month's budget reset?**"

#### C. Calendar × Project Correlation

Detect when external commitments conflict with internal project work:

```rust
pub fn correlate_calendar_projects(
    conn: &Connection,
    space_id: Ulid
) -> Result<Vec<Insight>, ForesightError>
```

**Example Insight:**

> "This week you have 18 hours of CalDAV events, but [[Project Alpha]] has 3 tasks due. Your time tracking shows you only average 5 hours/week on this project. **Shall I find time blocks for focused work?**"

#### D. Time × Productivity Correlation

Identify when time spent doesn't match task progress:

```rust
pub fn correlate_time_productivity(
    conn: &Connection,
    space_id: Ulid
) -> Result<Vec<Insight>, ForesightError>
```

**Example Insight:**

> "You've logged 12 hours on 'Refactor API', but the task is still at 20% progress. **This suggests possible blockers. Would you like to create a breakdown or flag this task?**"

## Implementation Plan

### Phase 1: Correlation Infrastructure (Priority: High)

1. **Create `correlation.rs` module**

   ```rust
   // packages/core-rs/src/correlation.rs
   pub struct CorrelationEngine { ... }
   impl CorrelationEngine {
       pub fn new() -> Self;
       pub fn gather_context(conn: &Connection, space_id: Ulid) -> CorrelationContext;
       pub fn analyze(context: &CorrelationContext) -> Vec<Correlation>;
   }
   ```

2. **Define correlation types**

   ```rust
   pub struct Correlation {
       pub correlation_type: CorrelationType,
       pub strength: f64,  // 0.0 - 1.0
       pub entities: Vec<String>,  // IDs of correlated entities
       pub pattern: CorrelationPattern,
   }

   pub enum CorrelationType {
       HealthWorkload,
       FinanceTasks,
       CalendarProjects,
       TimeProductivity,
   }
   ```

3. **Integrate with Foresight**

   ```rust
   // In foresight.rs
   pub fn generate_insights(
       conn: &Connection,
       space_id: Ulid
   ) -> Result<Vec<Insight>, ForesightError> {
       let mut insights = Vec::new();

       // Existing single-module insights
       insights.extend(detect_deadline_pressure(conn, space_id)?);
       insights.extend(detect_stale_projects(conn, space_id)?);

       // NEW: Cross-module correlations
       let correlations = CorrelationEngine::new()
           .gather_context(conn, space_id)
           .analyze();

       insights.extend(correlations_to_insights(correlations));

       Ok(insights)
   }
   ```

### Phase 2: Correlation Detectors (Priority: High)

Implement each correlation detector:

```rust
// packages/core-rs/src/correlation/health_workload.rs
pub fn detect_health_workload_pattern(
    health: &[HealthMetric],
    time_entries: &[TimeEntry],
    projects: &[Project]
) -> Option<Correlation>;

// packages/core-rs/src/correlation/finance_tasks.rs
pub fn detect_budget_task_conflict(
    transactions: &[Transaction],
    tasks: &[Task]
) -> Option<Correlation>;

// packages/core-rs/src/correlation/calendar_projects.rs
pub fn detect_calendar_project_conflict(
    calendar_events: &[CalendarEvent],
    projects: &[Project],
    time_entries: &[TimeEntry]
) -> Option<Correlation>;
```

### Phase 3: Actionable Suggestions (Priority: Medium)

Transform correlations into **actionable suggestions**:

```rust
pub struct ActionableSuggestion {
    pub suggestion_text: String,
    pub action_type: ActionType,
    pub parameters: HashMap<String, serde_json::Value>,
    pub confidence: f64,
}

pub enum ActionType {
    BlockCalendarTime { duration_minutes: i64 },
    SnoozeTask { task_id: String, until: i64 },
    CreateTaskBreakdown { task_id: String },
    AdjustProjectPriority { project_id: String },
}
```

### Phase 4: Learning Loop (Priority: Low)

Track user responses to improve suggestions:

```rust
pub fn record_suggestion_outcome(
    conn: &Connection,
    suggestion_id: &str,
    outcome: SuggestionOutcome
) -> Result<(), ForesightError>;

pub enum SuggestionOutcome {
    Accepted,
    Rejected { reason: Option<String> },
    Modified { changes: Vec<String> },
}
```

## Data Flow

```
┌─────────────────────────────────────────────┐
│         User Activity                       │
│  (Health, Time, Tasks, Calendar, Finance)   │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│     CorrelationEngine::gather_context()       │
│  Pulls data from all modules for time window  │
└───────────────┬───────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│          Pattern Detectors                    │
│  • Health × Workload                          │
│  • Finance × Tasks                            │
│  • Calendar × Projects                        │
│  • Time × Productivity                        │
└───────────────┬───────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│         Correlation Analysis                  │
│  Calculate correlation strength & patterns    │
└───────────────┬───────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│       Generate Actionable Insights            │
│  Convert correlations to user-facing insights │
└───────────────┬───────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│          Foresight Dashboard                  │
│  Display insights with suggested actions      │
└───────────────────────────────────────────────┘
```

## Performance Considerations

1. **Caching**: Cache correlation context for 5 minutes
2. **Incremental Analysis**: Only reanalyze when relevant data changes
3. **Threshold Tuning**: Only generate insights for correlations with strength > 0.7

## Privacy & Security

- All correlation happens **locally** on the user's device
- No data ever leaves the vault
- Correlations are computed on-demand, not stored
- Users can disable specific correlation types in settings

## Future Extensions

1. **Custom Correlation Rules**: Let users define their own patterns
2. **Machine Learning**: Use local ML models to detect subtle patterns
3. **Automation**: Automatically execute low-risk suggestions (with user consent)
4. **Voice Assistant Integration**: "What should I focus on today?"

---

**Next Steps:**

1. Implement `correlation.rs` module structure
2. Add health-workload correlation detector
3. Wire into existing `foresight.rs`
4. Test with sample data
5. Add user settings to enable/disable correlations
