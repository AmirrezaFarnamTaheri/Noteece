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

export interface MetricTypeDefinition {
  value: string;
  label: string;
  unit: string;
}

export const METRIC_TYPES: MetricTypeDefinition[] = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'blood_pressure_sys', label: 'Blood Pressure (Sys)', unit: 'mmHg' },
  { value: 'blood_pressure_dia', label: 'Blood Pressure (Dia)', unit: 'mmHg' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'steps', label: 'Steps', unit: 'steps' },
  { value: 'sleep', label: 'Sleep Hours', unit: 'hours' },
  { value: 'water', label: 'Water Intake', unit: 'ml' },
  { value: 'exercise_minutes', label: 'Exercise', unit: 'min' },
  { value: 'calories', label: 'Calories', unit: 'kcal' },
  { value: 'mood', label: 'Mood', unit: 'score' },
  { value: 'energy', label: 'Energy', unit: 'score' },
];

export const metricTypes = METRIC_TYPES.map((m) => ({ value: m.value, label: m.label }));

export const metricUnits: Record<string, string> = Object.fromEntries(METRIC_TYPES.map((m) => [m.value, m.unit]));

const metricColors: Record<string, string> = {
  weight: 'blue',
  blood_pressure: 'red',
  blood_pressure_sys: 'red',
  blood_pressure_dia: 'red',
  heart_rate: 'pink',
  steps: 'green',
  sleep: 'violet',
  water: 'cyan',
  exercise_minutes: 'orange',
  calories: 'yellow',
  mood: 'grape',
  energy: 'lime',
};

export const getDefaultUnit = (metricType: string): string => {
  if (Object.prototype.hasOwnProperty.call(metricUnits, metricType)) {
    // eslint-disable-next-line security/detect-object-injection
    return metricUnits[metricType] || '';
  }
  return '';
};

export const getMetricColor = (metricType: string): string => {
  if (Object.prototype.hasOwnProperty.call(metricColors, metricType)) {
    // eslint-disable-next-line security/detect-object-injection
    return metricColors[metricType] || 'gray';
  }
  return 'gray';
};
