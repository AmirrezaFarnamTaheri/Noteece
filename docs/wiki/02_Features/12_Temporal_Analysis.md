# Temporal Analysis & Correlation Visualization

Noteece's Foresight 2.0 engine provides powerful temporal analysis capabilities to help you understand patterns and correlations in your life data.

## Overview

The Temporal Graph component visualizes relationships between different metrics over time, helping you discover:

- **Correlations**: How different aspects of your life relate to each other
- **Patterns**: Recurring cycles (daily, weekly, monthly)
- **Anomalies**: Unusual deviations from normal patterns
- **Trends**: Long-term changes in behavior or outcomes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Tasks    │ │ Habits   │ │ Health   │ │ Time Entries │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       │            │            │              │            │
└───────┴────────────┴────────────┴──────────────┴────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Correlation Engine (Rust)                   │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Time Series     │    │ Pattern         │                 │
│  │ Aggregation     │ -> │ Detection       │                 │
│  └─────────────────┘    └─────────────────┘                 │
│           │                     │                           │
│           ▼                     ▼                           │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Statistical     │    │ Machine Learning│                 │
│  │ Analysis        │    │ Models          │                 │
│  └─────────────────┘    └─────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Temporal Graph (React)                       │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Timeline View   │    │ Scatter View    │                 │
│  │ (Line Chart)    │    │ (Correlation)   │                 │
│  └─────────────────┘    └─────────────────┘                 │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Zoom & Pan      │    │ Pattern         │                 │
│  │ Controls        │    │ Highlights      │                 │
│  └─────────────────┘    └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Available Metrics

### Productivity Metrics

- Task completion rate
- Focus time (hours)
- Productivity score
- Meeting hours

### Health Metrics

- Sleep hours
- Sleep quality
- Exercise minutes
- Mood score
- Energy level
- Steps count

### Habit Metrics

- Habit completion percentage
- Streak length
- Consistency score

### Time Tracking

- Deep work hours
- Administrative time
- Creative time
- Learning time

## Correlation Types

### Positive Correlation

When one metric increases, the other tends to increase.

**Example**: Sleep hours ↑ → Productivity score ↑

### Negative Correlation

When one metric increases, the other tends to decrease.

**Example**: Meeting hours ↑ → Deep work hours ↓

### Cyclic Patterns

Recurring patterns over regular intervals.

**Example**: Productivity peaks on Tuesdays and dips on Fridays

### Anomalies

Unexpected deviations from established patterns.

**Example**: Unusually low productivity on a typically productive day

## Using the Temporal Graph

### View Modes

**Timeline View** (Default)

- Shows both metrics over time
- Best for seeing trends and cycles
- Includes brush selector for zooming

**Scatter View**

- Plots metrics against each other
- Best for seeing correlation strength
- Point size indicates correlation confidence

### Time Ranges

| Range   | Data Points | Best For         |
| ------- | ----------- | ---------------- |
| Week    | 7 days      | Recent patterns  |
| Month   | 30 days     | Weekly cycles    |
| Quarter | 90 days     | Long-term trends |

### Controls

- **Zoom**: Adjust the chart scale (50% - 300%)
- **Brush**: Select a time range to focus on
- **Refresh**: Reload correlation data

### Reading the Results

**Correlation Strength**:

- `> 70%`: Strong correlation
- `30-70%`: Moderate correlation
- `< 30%`: Weak/no correlation

**Pattern Badges**:

- 🟢 Green: Positive pattern (desirable)
- 🔴 Red: Negative pattern (concerning)
- 🔵 Blue: Cyclic pattern (recurring)
- 🟠 Orange: Anomaly (unusual)

## API Reference

### Get Temporal Correlations

```typescript
const correlations = await invoke('get_temporal_correlations_cmd', {
  spaceId: 'work',
  metric1: 'productivity',
  metric2: 'sleep_hours',
  timeRange: 'month',
});
```

### Response Structure

```typescript
interface TemporalPattern {
  id: string;
  name: string;
  description: string;
  strength: number; // 0.0 - 1.0
  start_time: number; // Unix timestamp
  end_time: number;
  data_points: CorrelationPoint[];
  type: 'positive' | 'negative' | 'cyclic' | 'anomaly';
}

interface CorrelationPoint {
  timestamp: number;
  date: string;
  metric1: number;
  metric2: number;
  correlation: number; // -1.0 to 1.0
  label?: string;
}
```

## Insights Engine

The correlation engine can generate actionable insights:

```typescript
const insights = await invoke('get_correlation_insights_cmd', {
  spaceId: 'work',
  limit: 5,
});

// Example response:
[
  {
    type: 'recommendation',
    title: 'Sleep Impact on Productivity',
    description: 'Your productivity increases by 15% on days after 8+ hours of sleep.',
    confidence: 0.82,
    action: 'Consider maintaining a consistent 8-hour sleep schedule.',
  },
];
```

## Best Practices

1. **Consistent Tracking**: Track metrics consistently for accurate patterns
2. **Sufficient Data**: Need 2+ weeks for reliable correlations
3. **Context Awareness**: Consider external factors (holidays, illness)
4. **Actionable Focus**: Focus on correlations you can influence
5. **Regular Review**: Check weekly for emerging patterns

## Privacy

All correlation analysis happens locally:

- No data sent to external servers
- Patterns stored in your encrypted vault
- Full control over what metrics to analyze

---

_Version 1.1.0_
_SPDX-License-Identifier: AGPL-3.0-or-later_
