/**
 * Dashboard Widgets Index
 * 
 * This module exports all dashboard widgets for easy importing.
 * Widgets are organized by category for better maintainability.
 */

// Productivity Widgets
export { DueTodayWidget } from './DueTodayWidget';
export { TasksByPriority } from './TasksByPriority';
export { FocusTimer } from './FocusTimer';
export { TimeTrackingWidget } from './TimeTrackingWidget';
export { RecentProjects } from './RecentProjects';

// Analytics & Insights Widgets
export { InsightsWidget } from './InsightsWidget';
export { NotesHeatmap } from './NotesHeatmap';
export { QuickStatsWidget } from './QuickStatsWidget';
export { NotesStatsWidget } from './NotesStatsWidget';

// Personal Growth Widgets
export { GoalsTrackerWidget } from './GoalsTrackerWidget';
export { HabitsTracker } from './HabitsTracker';
export { AchievementBadgesWidget } from './AchievementBadgesWidget';
export { WeeklyProgress } from './WeeklyProgress';

// Health & Lifestyle Widgets
export { HealthWidget } from './HealthWidget';
export { MoodTracker } from './MoodTracker';
export { MusicWidget } from './MusicWidget';

// Navigation & Quick Actions
export { QuickCapture } from './QuickCapture';
export { BookmarksWidget } from './BookmarksWidget';
export { TagsCloud } from './TagsCloud';
export { CalendarWidget } from './CalendarWidget';

// Social Widgets
export { SocialWidget } from './SocialWidget';

// Project Widgets
export { ProjectTimeline } from './ProjectTimeline';

// Universal/Combined Widgets
export { UniversalDashboardWidget } from './UniversalDashboardWidget';

// Widget Types
export interface WidgetProps {
  spaceId?: string;
  className?: string;
  compact?: boolean;
}

// Widget Registry for dynamic rendering
export const WIDGET_REGISTRY = {
  productivity: ['DueTodayWidget', 'TasksByPriority', 'FocusTimer', 'TimeTrackingWidget', 'RecentProjects'],
  analytics: ['InsightsWidget', 'NotesHeatmap', 'QuickStatsWidget', 'NotesStatsWidget'],
  growth: ['GoalsTrackerWidget', 'HabitsTracker', 'AchievementBadgesWidget', 'WeeklyProgress'],
  health: ['HealthWidget', 'MoodTracker', 'MusicWidget'],
  navigation: ['QuickCapture', 'BookmarksWidget', 'TagsCloud', 'CalendarWidget'],
  social: ['SocialWidget'],
  project: ['ProjectTimeline'],
} as const;

export type WidgetCategory = keyof typeof WIDGET_REGISTRY;
export type WidgetName = typeof WIDGET_REGISTRY[WidgetCategory][number];

