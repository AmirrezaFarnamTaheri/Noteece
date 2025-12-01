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

export interface MetricTypeConfig {
  value: string;
  label: string;
  unit: string;
}

export const METRIC_TYPES: MetricTypeConfig[] = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'steps', label: 'Steps', unit: 'steps' },
  { value: 'sleep', label: 'Sleep', unit: 'hours' },
  { value: 'water', label: 'Water Intake', unit: 'ml' },
  { value: 'calories', label: 'Calories', unit: 'kcal' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'blood_pressure_sys', label: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  { value: 'blood_pressure_dia', label: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  { value: 'mood', label: 'Mood', unit: 'score' },
  { value: 'energy', label: 'Energy Level', unit: 'score' },
  { value: 'exercise_minutes', label: 'Exercise Minutes', unit: 'min' },
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
  sleep: 'hours',
  water: 'ml',
  blood_pressure_sys: 'mmHg',
  blood_pressure_dia: 'mmHg',
  mood: 'score',
  energy: 'score',
};

// Use a switch statement to avoid Object Injection Sink warnings
export const getDefaultUnit = (metricType: string): string => {
  switch (metricType) {
    case 'weight':
      return 'kg';
    case 'blood_pressure':
    case 'blood_pressure_sys':
    case 'blood_pressure_dia':
      return 'mmHg';
    case 'heart_rate':
      return 'bpm';
    case 'steps':
      return 'steps';
    case 'sleep_hours':
    case 'sleep':
      return 'hours';
    case 'water_intake':
    case 'water':
      return 'ml';
    case 'exercise_minutes':
      return 'min';
    case 'calories':
      return 'kcal';
    case 'mood':
    case 'energy':
      return 'score';
    default:
      return '';
  }
};
