// Widget Library - Comprehensive Dashboard Components for Noteece

// Stats and Metrics
export { QuickStatsCard, QuickStatsGrid, StatsRing } from "./QuickStatsCard";
export type { QuickStatProps } from "./QuickStatsCard";

// Activity and Timeline
export { ActivityTimeline, CompactActivityList } from "./ActivityTimeline";
export type { ActivityItem, ActivityTimelineProps } from "./ActivityTimeline";

export { ActivityHeatmap, ActivityHeatmapCompact } from "./ActivityHeatmap";
export type { ActivityData, ActivityHeatmapProps } from "./ActivityHeatmap";

// Time Management
export { FocusTimer, MiniFocusTimer } from "./FocusTimer";
export type { FocusTimerProps, TimerMode } from "./FocusTimer";

// Habits and Health
export { HabitTracker, CompactHabitList, HabitCard } from "./HabitTracker";
export type { HabitEntry, HabitTrackerProps } from "./HabitTracker";

export {
  HealthDashboard,
  HealthMetricCard,
  HealthSummaryRing,
} from "./HealthDashboard";
export type {
  HealthMetric,
  HealthGoal,
  HealthDashboardProps,
} from "./HealthDashboard";

// Progress Tracking
export {
  ProgressDashboard,
  ProgressList,
  ProgressCard,
  ProgressRing,
} from "./ProgressDashboard";
export type {
  ProgressMetric,
  ProgressDashboardProps,
} from "./ProgressDashboard";

// Calendar and Events
export { MiniCalendar, CompactCalendar } from "./MiniCalendar";
export type { CalendarEvent, MiniCalendarProps } from "./MiniCalendar";

// Notifications
export { NotificationCenter, NotificationPopover } from "./NotificationCenter";
export type {
  Notification,
  NotificationCenterProps,
} from "./NotificationCenter";

// Re-export everything as a default object for convenience
import { QuickStatsCard, QuickStatsGrid, StatsRing } from "./QuickStatsCard";
import { ActivityTimeline, CompactActivityList } from "./ActivityTimeline";
import { ActivityHeatmap, ActivityHeatmapCompact } from "./ActivityHeatmap";
import { FocusTimer, MiniFocusTimer } from "./FocusTimer";
import { HabitTracker, CompactHabitList, HabitCard } from "./HabitTracker";
import {
  HealthDashboard,
  HealthMetricCard,
  HealthSummaryRing,
} from "./HealthDashboard";
import {
  ProgressDashboard,
  ProgressList,
  ProgressCard,
  ProgressRing,
} from "./ProgressDashboard";
import { MiniCalendar, CompactCalendar } from "./MiniCalendar";
import { NotificationCenter, NotificationPopover } from "./NotificationCenter";

export const Widgets = {
  // Stats
  QuickStatsCard,
  QuickStatsGrid,
  StatsRing,

  // Activity
  ActivityTimeline,
  CompactActivityList,
  ActivityHeatmap,
  ActivityHeatmapCompact,

  // Time
  FocusTimer,
  MiniFocusTimer,

  // Habits & Health
  HabitTracker,
  CompactHabitList,
  HabitCard,
  HealthDashboard,
  HealthMetricCard,
  HealthSummaryRing,

  // Progress
  ProgressDashboard,
  ProgressList,
  ProgressCard,
  ProgressRing,

  // Calendar
  MiniCalendar,
  CompactCalendar,

  // Notifications
  NotificationCenter,
  NotificationPopover,
};

export default Widgets;
