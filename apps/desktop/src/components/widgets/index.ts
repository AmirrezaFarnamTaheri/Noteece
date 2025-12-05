/**
 * Widgets Index
 *
 * Exports all dashboard widgets for easy importing.
 */

// Widgets with Default Exports
export { default as DueTodayWidget } from './DueTodayWidget';
export { default as FinanceSnapshotWidget } from './FinanceSnapshotWidget';
export { default as GamificationWidget } from './GamificationWidget';
export { default as HabitsTracker } from './HabitsTracker';
export { default as HealthWidget } from './HealthWidget';
export { default as InsightsWidget } from './InsightsWidget';
export { default as LifeBalanceWidget } from './LifeBalanceWidget';
export { default as MoodTracker } from './MoodTracker';
export { default as MusicWidget } from './MusicWidget';
export { default as NotesHeatmap } from './NotesHeatmap';
export { default as ProjectTimeline } from './ProjectTimeline';
export { default as SocialWidget } from './SocialWidget';
export { default as TimeTrackingWidget } from './TimeTrackingWidget';

// Widgets with Named Exports that need to be re-exported
export { AchievementBadgesWidget } from './AchievementBadgesWidget';
export { BookmarksWidget } from './BookmarksWidget';
export { CalendarWidget } from './CalendarWidget';
export { FocusTimer } from './FocusTimer';
export { GoalsTrackerWidget } from './GoalsTrackerWidget';
export { NotesStatsWidget } from './NotesStatsWidget';
export { QuickCapture } from './QuickCapture';
export { QuickStatsWidget } from './QuickStatsWidget';
export { RecentProjects } from './RecentProjects';
export { TagsCloud } from './TagsCloud';
export { TasksByPriority } from './TasksByPriority';
export { UniversalDashboardWidget } from './UniversalDashboardWidget';
export { WeeklyProgress } from './WeeklyProgress';

// Re-export types
export type { TimelineItem, VirtualizedTimelineProps } from '../virtualized/VirtualizedTimeline';
