// packages/types/src/index.ts

export type ULID = string;

export interface Space {
  id: ULID;
  name: string;
  icon?: string;
  enabled_modes_json: string; // JSON array of mode IDs
}

export interface Note {
  id: ULID;
  space_id: ULID;
  title: string;
  content_md: string;
  created_at: number; // Unix timestamp
  modified_at: number; // Unix timestamp
  is_trashed: boolean;
}

export type TaskStatus = 'inbox' | 'next' | 'in_progress' | 'waiting' | 'done' | 'cancelled';

export interface Task {
  id: ULID;
  space_id: ULID;
  note_id?: ULID;
  project_id?: ULID;
  parent_task_id?: ULID;
  title: string;
  description?: string;
  status: TaskStatus;
  due_at?: number; // Unix timestamp
  start_at?: number; // Unix timestamp
  completed_at?: number; // Unix timestamp
  priority?: 1 | 2 | 3 | 4;
  estimate_minutes?: number;
  recur_rule?: string; // iCal RRULE
  context?: string;
  area?: string;
}

export type ProjectStatus = 'proposed' | 'active' | 'blocked' | 'done' | 'archived';

export interface Project {
  id: ULID;
  space_id: ULID;
  title: string;
  goal_outcome?: string;
  status: ProjectStatus;
  confidence?: number;
  start_at?: number; // Unix timestamp
  target_end_at?: number; // Unix timestamp
}

export interface Tag {
  id: ULID;
  space_id: ULID;
  name: string;
  color?: string;
}

export interface Person {
  id: ULID;
  space_id?: ULID;
  name?: string;
  email?: string;
  org?: string;
}

export interface ProjectMilestone {
  id: ULID;
  project_id: ULID;
  title: string;
  due_at?: number; // Unix timestamp
  status?: string;
}

export interface ProjectRisk {
  id: ULID;
  project_id: ULID;
  description: string;
  impact?: string;
  likelihood?: string;
  mitigation?: string;
  owner_person_id?: ULID;
}

export interface ProjectUpdate {
  id: ULID;
  project_id: ULID;
  when_at: number; // Unix timestamp
  health?: 'green' | 'amber' | 'red';
  summary: string;
}

export type SearchScope = 'note' | 'project' | 'space' | 'vault_all';

export interface SavedSearch {
  id: ULID;
  space_id: ULID;
  title: string;
  query_string: string;
  scope: SearchScope;
}

export type KnowledgeCardState = 'new' | 'learning' | 'review' | 'relearning';

export interface KnowledgeCard {
  id: ULID;
  note_id: ULID;
  deck_id?: string;
  state: KnowledgeCardState;
  due_at: number; // Unix timestamp
  stability: number;
  difficulty: number;
  lapses: number;
  revision_history_json: string; // JSON array
}

export interface ReviewLog {
  id: ULID;
  card_id: ULID;
  review_at: number; // Unix timestamp
  rating: number;
  state: string;
  due_at: number; // Unix timestamp
  stability: number;
  difficulty: number;
  lapses: number;
}

export type FormFieldType = 'Text' | 'Textarea' | 'Number' | 'Checkbox' | 'Date' | 'Time';

export interface FormField {
  name: string;
  label: string;
  field_type: FormFieldType;
  default_value?: string;
}

export interface FormTemplate {
  id: ULID;
  space_id: ULID;
  name: string;
  fields: FormField[];
}

export interface WeeklyCount {
  week: string;
  count: number;
}

export interface AnalyticsData {
  note_count: number;
  task_count: number;
  project_count: number;
  tasks_completed_by_week: WeeklyCount[];
  notes_created_by_week: WeeklyCount[];
}

export interface TimeEntry {
  id: ULID;
  space_id: ULID;
  task_id?: ULID;
  project_id?: ULID;
  note_id?: ULID;
  description?: string;
  started_at: number; // Unix timestamp
  ended_at?: number; // Unix timestamp
  duration_seconds?: number;
  is_running: boolean;
}

export interface TimeStats {
  total_seconds: number;
  entry_count: number;
  average_seconds: number;
}

export interface SyncTask {
  id: string;
  device_id: string;
  space_id: string;
  direction: string;
  status: string;
  progress: number;
  created_at: number;
}

export interface SyncStats {
  total_synced: number;
  last_sync_at: number | null;
  success_rate: number;
  conflicts_total: number;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: 'Desktop' | 'Mobile' | 'Web';
  last_seen: number;
  sync_address: string;
  sync_port: number;
  protocol_version: string;
}

export interface DiscoveredDevice {
  device_id: string;
  device_name: string;
  device_type: 'Desktop' | 'Mobile' | 'Tablet';
  ip_address: string;
  sync_port: number;
  os_version: string;
  last_seen: string; // DateTime serialized
}

export type ConflictType = 'UpdateUpdate' | 'DeleteUpdate' | 'UpdateDelete';

export enum ConflictResolution {
  UseLocal = 'UseLocal',
  UseRemote = 'UseRemote',
  Merge = 'Merge',
}

export interface SyncConflict {
  entity_type: string;
  entity_id: string;
  local_version: number[]; // Vec<u8> serializes to number array
  remote_version: number[];
  conflict_type: ConflictType;
  space_id?: string;
}

// --- New types for Personal Modes & Social ---

export interface HealthMetric {
  id: string;
  space_id: string;
  metric_type: string;
  value: number;
  unit: string;
  notes?: string;
  recorded_at: number;
  created_at: number;
  updated_at: number;
}

export interface Goal {
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

export interface Habit {
  id: string;
  space_id: string;
  title: string;
  frequency: string;
  is_archived: boolean;
  created_at: number;
}

export interface Transaction {
  id: string;
  space_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  category: string;
  account_id: string;
  date: number;
  description?: string;
  created_at: number;
}

export interface Recipe {
  id: string;
  space_id: string;
  note_id: string;
  name: string;
  rating: number;
  difficulty: string;
  created_at: number;
}

export interface Trip {
  id: string;
  space_id: string;
  note_id: string;
  name: string;
  destination: string;
  start_date: number;
  end_date: number;
  created_at: number;
}

export interface GraphSnapshot {
  space_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: GraphMetrics;
  captured_at: number;
}

export interface GraphNode {
  id: string;
  label: string;
  node_type: string;
  centrality: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphMetrics {
  node_count: number;
  edge_count: number;
  density: number;
  avg_clustering: number;
}

export interface GraphMilestone {
  note_id: string;
  title: string;
  date: number;
  importance: number;
  reason: string;
}

export interface SpaceUser {
  user_id: string;
  role: string;
  joined_at: number;
}

export interface Role {
  name: string;
  permissions: string[];
}

export interface WebViewSession {
  id: string;
  account_id: string;
  cookies: string;
  user_agent: string;
}

export interface AnalyticsOverview {
  total_posts: number;
  total_engagement: number;
  top_platform: string;
}

export interface BackupMetadata {
  id: string;
  space_id?: string;
  created_at: number;
  size_bytes: number;
  file_count: number;
  encrypted: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: number;
}

export interface Session {
  token: string;
  expires_at: number;
  user_id: string;
}

export interface SearchResult {
  entity_type: string;
  entity_id: string;
  title?: string;
  snippet?: string;
  score: number;
}

// Social Media Suite types
export * from './social';
export * from './dashboard';
