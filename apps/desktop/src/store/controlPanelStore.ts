/**
 * Control Panel Store
 * 
 * Manages widget and feature visibility/enablement across the app
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'productivity' | 'health' | 'social' | 'insights' | 'other';
  size: 'small' | 'medium' | 'large';
  order: number;
}

export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'core' | 'ai' | 'sync' | 'social' | 'advanced';
  beta?: boolean;
}

interface ControlPanelState {
  widgets: WidgetConfig[];
  features: FeatureConfig[];
  
  // Widget actions
  toggleWidget: (id: string) => void;
  setWidgetOrder: (widgets: WidgetConfig[]) => void;
  resetWidgets: () => void;
  
  // Feature actions
  toggleFeature: (id: string) => void;
  resetFeatures: () => void;
  
  // Queries
  isWidgetEnabled: (id: string) => boolean;
  isFeatureEnabled: (id: string) => boolean;
  getEnabledWidgets: () => WidgetConfig[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'quickStats', name: 'Quick Stats', description: 'Overview of notes, tasks, and projects', enabled: true, category: 'productivity', size: 'medium', order: 0 },
  { id: 'dueToday', name: 'Due Today', description: 'Tasks due today', enabled: true, category: 'productivity', size: 'medium', order: 1 },
  { id: 'recentNotes', name: 'Recent Notes', description: 'Recently edited notes', enabled: true, category: 'productivity', size: 'medium', order: 2 },
  { id: 'calendar', name: 'Calendar', description: 'Mini calendar view', enabled: true, category: 'productivity', size: 'medium', order: 3 },
  { id: 'focusTimer', name: 'Focus Timer', description: 'Pomodoro timer', enabled: true, category: 'productivity', size: 'small', order: 4 },
  { id: 'habits', name: 'Habits Tracker', description: 'Daily habit tracking', enabled: true, category: 'health', size: 'medium', order: 5 },
  { id: 'goals', name: 'Goals Tracker', description: 'Goal progress', enabled: true, category: 'health', size: 'medium', order: 6 },
  { id: 'mood', name: 'Mood Tracker', description: 'Daily mood logging', enabled: true, category: 'health', size: 'small', order: 7 },
  { id: 'health', name: 'Health Metrics', description: 'Health statistics', enabled: false, category: 'health', size: 'large', order: 8 },
  { id: 'social', name: 'Social Feed', description: 'Aggregated social posts', enabled: false, category: 'social', size: 'large', order: 9 },
  { id: 'insights', name: 'AI Insights', description: 'AI-powered insights', enabled: true, category: 'insights', size: 'medium', order: 10 },
  { id: 'bookmarks', name: 'Bookmarks', description: 'Saved bookmarks', enabled: false, category: 'other', size: 'medium', order: 11 },
  { id: 'achievements', name: 'Achievements', description: 'Gamification badges', enabled: false, category: 'other', size: 'medium', order: 12 },
  { id: 'notesHeatmap', name: 'Notes Heatmap', description: 'Activity heatmap', enabled: false, category: 'insights', size: 'large', order: 13 },
  { id: 'weeklyProgress', name: 'Weekly Progress', description: 'Weekly statistics', enabled: true, category: 'insights', size: 'medium', order: 14 },
  { id: 'tagsCloud', name: 'Tags Cloud', description: 'Tag visualization', enabled: false, category: 'other', size: 'medium', order: 15 },
  { id: 'recentProjects', name: 'Recent Projects', description: 'Active projects', enabled: true, category: 'productivity', size: 'medium', order: 16 },
  { id: 'timeTracking', name: 'Time Tracking', description: 'Time entries', enabled: false, category: 'productivity', size: 'medium', order: 17 },
  { id: 'music', name: 'Music Player', description: 'Music controls', enabled: false, category: 'other', size: 'small', order: 18 },
];

const DEFAULT_FEATURES: FeatureConfig[] = [
  { id: 'notes', name: 'Notes', description: 'Note-taking and knowledge management', enabled: true, category: 'core' },
  { id: 'tasks', name: 'Tasks', description: 'Task and todo management', enabled: true, category: 'core' },
  { id: 'projects', name: 'Projects', description: 'Project management hub', enabled: true, category: 'core' },
  { id: 'calendar', name: 'Calendar', description: 'Calendar and scheduling', enabled: true, category: 'core' },
  { id: 'habits', name: 'Habits', description: 'Habit tracking', enabled: true, category: 'core' },
  { id: 'goals', name: 'Goals', description: 'Goal setting and tracking', enabled: true, category: 'core' },
  { id: 'health', name: 'Health Hub', description: 'Health metrics tracking', enabled: true, category: 'core' },
  { id: 'localAI', name: 'Local AI', description: 'On-device AI processing', enabled: true, category: 'ai' },
  { id: 'cloudAI', name: 'Cloud AI', description: 'Cloud-based AI providers', enabled: false, category: 'ai' },
  { id: 'aiInsights', name: 'AI Insights', description: 'AI-powered correlation insights', enabled: true, category: 'ai' },
  { id: 'aiChat', name: 'AI Chat', description: 'Chat with your vault', enabled: true, category: 'ai', beta: true },
  { id: 'p2pSync', name: 'P2P Sync', description: 'Device-to-device sync', enabled: true, category: 'sync' },
  { id: 'caldav', name: 'CalDAV', description: 'Calendar synchronization', enabled: false, category: 'sync' },
  { id: 'socialHub', name: 'Social Hub', description: 'Social media aggregation', enabled: false, category: 'social' },
  { id: 'socialCapture', name: 'Social Capture', description: 'WebView content capture', enabled: false, category: 'social', beta: true },
  { id: 'ocr', name: 'OCR', description: 'Text extraction from images', enabled: true, category: 'advanced' },
  { id: 'spacedRepetition', name: 'Spaced Repetition', description: 'Flashcard learning', enabled: true, category: 'advanced' },
  { id: 'automation', name: 'Automation', description: 'Workflow automation DSL', enabled: false, category: 'advanced', beta: true },
  { id: 'weeklyReview', name: 'Weekly Review', description: 'Structured review workflow', enabled: true, category: 'advanced' },
  { id: 'foresight', name: 'Foresight', description: 'Proactive insights engine', enabled: true, category: 'ai' },
];

export const useControlPanelStore = create<ControlPanelState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,
      features: DEFAULT_FEATURES,

      toggleWidget: (id: string) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
          ),
        }));
      },

      setWidgetOrder: (widgets: WidgetConfig[]) => {
        set({ widgets });
      },

      resetWidgets: () => {
        set({ widgets: DEFAULT_WIDGETS });
      },

      toggleFeature: (id: string) => {
        set((state) => ({
          features: state.features.map((f) =>
            f.id === id ? { ...f, enabled: !f.enabled } : f
          ),
        }));
      },

      resetFeatures: () => {
        set({ features: DEFAULT_FEATURES });
      },

      isWidgetEnabled: (id: string) => {
        return get().widgets.find((w) => w.id === id)?.enabled ?? false;
      },

      isFeatureEnabled: (id: string) => {
        return get().features.find((f) => f.id === id)?.enabled ?? false;
      },

      getEnabledWidgets: () => {
        return get()
          .widgets
          .filter((w) => w.enabled)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: 'noteece-control-panel',
    }
  )
);

