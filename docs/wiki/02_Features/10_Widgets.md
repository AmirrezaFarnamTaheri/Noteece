# Dashboard Widgets

Noteece provides a rich set of customizable widgets for the dashboard, helping you visualize and interact with your data at a glance.

## Available Widgets

### 1. Life Balance Radar Chart

The Life Balance widget visualizes time distribution across different life areas:

- **Work** - Professional and career activities
- **Personal** - Personal projects and hobbies
- **Health** - Exercise, wellness, and medical
- **Learning** - Education and skill development
- **Social** - Friends, family, and networking
- **Creative** - Art, writing, and creative pursuits
- **Rest** - Sleep and relaxation

**Features:**

- Radar chart visualization
- Comparison against configurable targets
- Balance score calculation (0-100%)
- Time range selection (week/month/quarter)
- Status indicators (Excellent/Good/Needs Attention/Imbalanced)

**Data Source:** `time_entry` table aggregated by space categories.

### 2. Gamification & Progress Widget

Track your achievements and maintain motivation with gamification elements:

**XP & Leveling:**

- Earn XP for completing tasks, habits, and goals
- Progressive level system with titles (Beginner → Legend)
- Visual XP progress bar to next level

**Streaks:**

- Track consecutive days of activity
- Streak freeze system to protect your streak
- Best streak record display

**Achievements:**

- Unlockable achievements for milestones
- Progress tracking for incomplete achievements
- Badge display system

**Statistics:**

- Total tasks completed
- Total habits completed
- Achievement progress (X/Y unlocked)

### 3. Finance Snapshot Widget

Monitor your financial health with spending visualizations:

**Summary Cards:**

- Total income (green)
- Total expenses (red)
- Net savings/deficit (blue/orange)

**Trend Analysis:**

- Area chart showing income vs expenses over time
- Trend percentage vs previous period
- Visual indicators for increasing/decreasing spending

**Category Breakdown:**

- Bar chart of top expense categories
- Category-coded colors
- Quick identification of spending patterns

**Time Ranges:**

- Weekly view for recent spending
- Monthly view for broader trends

### 4. Quick Tasks Widget

Fast task management from the dashboard:

- Today's tasks list
- Quick add new task
- Priority indicators
- Due date display
- One-click completion

### 5. Upcoming Events Widget

Calendar integration for upcoming commitments:

- Next 7 days of events
- CalDAV sync status
- Quick event creation
- Meeting join links

### 6. Notes Quick Access Widget

Recent and pinned notes:

- Recently modified notes
- Pinned notes section
- Quick note creation
- Search integration

### 7. Habits Tracker Widget

Daily habit tracking visualization:

- Today's habits checklist
- Streak indicators per habit
- Completion percentage
- Weekly heatmap

### 8. Social Feed Widget

Recent social captures (Prime features):

- Timeline of captured posts
- Platform indicators
- Quick archive/delete
- Category tags

## Customization

### Control Panel

Access widget customization through Settings → Control Panel:

1. **Enable/Disable Widgets** - Toggle individual widgets on/off
2. **Widget Layout** - Drag and drop to reorder
3. **Widget Size** - Choose between compact and expanded views
4. **Refresh Rate** - Configure data refresh intervals

### Widget Configuration

Each widget can be individually configured:

```typescript
interface WidgetConfig {
  enabled: boolean;
  position: { row: number; col: number };
  size: "compact" | "normal" | "expanded";
  refreshInterval: number; // milliseconds
  customSettings?: Record<string, unknown>;
}
```

## Performance

Widgets are optimized for performance:

- **Lazy Loading** - Widgets load data only when visible
- **Caching** - Data is cached with configurable TTL
- **Virtualization** - Large lists use windowing
- **Debouncing** - Prevents excessive API calls

## Creating Custom Widgets

Developers can create custom widgets by implementing the `Widget` interface:

```typescript
interface Widget {
  id: string;
  name: string;
  component: React.ComponentType<WidgetProps>;
  defaultConfig: WidgetConfig;
  minSize: { width: number; height: number };
  maxSize?: { width: number; height: number };
}
```

Register custom widgets in `controlPanelStore.ts`.

## Data Sources

Widgets pull data from various sources:

| Widget       | Primary Table(s)            | Update Frequency |
| ------------ | --------------------------- | ---------------- |
| Life Balance | `time_entry`, `space`       | 5 minutes        |
| Gamification | `user_stats`, `achievement` | 1 minute         |
| Finance      | `transaction`               | 5 minutes        |
| Quick Tasks  | `task`                      | Real-time        |
| Events       | `calendar_event`            | 5 minutes        |
| Notes        | `note`                      | Real-time        |
| Habits       | `habit`, `habit_log`        | 1 minute         |
| Social Feed  | `social_post`               | 1 minute         |

---

_Version 1.1.0_
_SPDX-License-Identifier: AGPL-3.0-or-later_
