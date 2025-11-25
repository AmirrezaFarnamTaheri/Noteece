/**
 * Health Mode Types
 */

export interface HealthMetric {
  id: string;
  space_id: string;
  metric_type: string;
  value: number;
  unit: string;
  notes?: string;
  recorded_at: number;
  created_at: number;
}

export interface HealthGoal {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  category: string;
  start_date: number;
  target_date?: number;
  is_completed: boolean;
  created_at: number;
  updated_at: number;
}

export const metricTypes = [
  { value: 'weight', label: 'Weight' },
  { value: 'blood_pressure', label: 'Blood Pressure' },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'steps', label: 'Steps' },
  { value: 'sleep_hours', label: 'Sleep Hours' },
  { value: 'water_intake', label: 'Water Intake' },
  { value: 'exercise_minutes', label: 'Exercise Minutes' },
  { value: 'calories', label: 'Calories' },
];

export const metricUnits: Record<string, string> = {
  weight: 'kg',
  blood_pressure: 'mmHg',
  heart_rate: 'bpm',
  steps: 'steps',
  sleep_hours: 'hours',
  water_intake: 'ml',
  exercise_minutes: 'min',
  calories: 'kcal',
};

export const getDefaultUnit = (metricType: string): string => {
  return metricUnits[metricType] || '';
};

