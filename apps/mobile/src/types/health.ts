/**
 * Health Hub Types
 *
 * Type definitions for health metrics, activities, and tracking.
 */

export interface HealthMetric {
  id: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: number;
  source: string; // "manual", "apple_health", "google_fit", etc.
  notes: string | null;
}

export type MetricType =
  | 'steps'
  | 'distance'
  | 'calories'
  | 'heart_rate'
  | 'weight'
  | 'blood_pressure'
  | 'sleep'
  | 'water'
  | 'exercise'
  | 'mood';

export interface Activity {
  id: string;
  type: ActivityType;
  name: string;
  duration: number; // in minutes
  calories: number;
  distance: number | null; // in km
  startedAt: number;
  endedAt: number;
  notes: string | null;
}

export type ActivityType = 'running' | 'walking' | 'cycling' | 'swimming' | 'yoga' | 'gym' | 'sports' | 'other';

export interface HealthGoal {
  id: string;
  type: MetricType;
  target: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  createdAt: number;
}

export interface HealthStats {
  today: DayStats;
  week: WeekStats;
  month: MonthStats;
  goals: GoalProgress[];
}

export interface DayStats {
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  water: number;
  sleep: number;
  mood: number | null; // 1-5 scale
}

export interface WeekStats {
  totalSteps: number;
  totalDistance: number;
  totalCalories: number;
  totalActiveMinutes: number;
  averageSteps: number;
  daysActive: number;
  activities: Activity[];
}

export interface MonthStats {
  totalSteps: number;
  totalDistance: number;
  totalCalories: number;
  daysTracked: number;
  weightChange: number | null;
  topActivities: ActivitySummary[];
}

export interface ActivitySummary {
  type: ActivityType;
  count: number;
  totalDuration: number;
  totalCalories: number;
}

export interface GoalProgress {
  goal: HealthGoal;
  current: number;
  percentage: number;
  isAchieved: boolean;
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  running: '🏃',
  walking: '🚶',
  cycling: '🚴',
  swimming: '🏊',
  yoga: '🧘',
  gym: '💪',
  sports: '⚽',
  other: '🎯',
};

export const METRIC_ICONS: Record<MetricType, string> = {
  steps: 'footsteps',
  distance: 'navigate',
  calories: 'flame',
  heart_rate: 'heart',
  weight: 'fitness',
  blood_pressure: 'pulse',
  sleep: 'moon',
  water: 'water',
  exercise: 'barbell',
  mood: 'happy',
};
