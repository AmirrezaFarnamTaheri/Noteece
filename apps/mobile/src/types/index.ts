// Core types for mobile app
export interface Task {
  id: string;
  spaceId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueAt?: number;
  completedAt?: number;
  progress?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  space_id: string;
  title: string;
  content_md: string;
  tags?: string[];
  created_at: number;
  modified_at: number;
  is_trashed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  location?: string;
  source: 'caldav' | 'internal';
  color: string;
}

export interface TimeEntry {
  id: string;
  spaceId: string;
  taskId?: string;
  projectId?: string;
  description?: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  isRunning: boolean;
}

export interface HealthMetric {
  id: string;
  spaceId: string;
  metricType: 'mood' | 'energy' | 'sleep' | 'exercise' | 'weight' | 'custom';
  value: number;
  unit?: string;
  notes?: string;
  recordedAt: number;
  createdAt: number;
}

export interface Insight {
  id: string;
  insightType: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  suggestedActions: SuggestedAction[];
  createdAt: number;
  dismissed: boolean;
}

export interface SuggestedAction {
  actionType: string;
  label: string;
  description: string;
  parameters: Record<string, any>;
}

export interface TimelineItem {
  id: string;
  type: 'task' | 'event' | 'insight' | 'block';
  time: number;
  endTime?: number;
  title: string;
  subtitle?: string;
  color: string;
  data: Task | CalendarEvent | Insight | any;
}

export interface NFCTrigger {
  id: string;
  tagId: string;
  actionType: 'start_time' | 'log_habit' | 'open_note' | 'quick_capture';
  parameters: Record<string, any>;
  createdAt: number;
}

export interface LocationTrigger {
  id: string;
  taskId: string;
  locationType: 'arrive' | 'leave';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enabled: boolean;
  createdAt: number;
}

export interface SyncState {
  deviceId: string;
  deviceName: string;
  lastSyncTimestamp: number;
  lastSyncDirection: 'pull' | 'push' | 'bidirectional';
  totalSyncedEntities: number;
  updatedAt: number;
}

export interface QuickCapture {
  type: 'thought' | 'task' | 'health' | 'expense';
  content: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  photos?: string[];
  audio?: string;
}
