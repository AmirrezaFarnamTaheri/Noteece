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

export type TaskStatus =
  | "inbox"
  | "next"
  | "in_progress"
  | "waiting"
  | "done"
  | "cancelled";

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

export type ProjectStatus =
  | "proposed"
  | "active"
  | "blocked"
  | "done"
  | "archived";

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
  health?: "green" | "amber" | "red";
  summary: string;
}

export type SearchScope = "note" | "project" | "space" | "vault_all";

export interface SavedSearch {
  id: ULID;
  space_id: ULID;
  title: string;
  query_string: string;
  scope: SearchScope;
}

export type KnowledgeCardState = "new" | "learning" | "review" | "relearning";

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

export type FormFieldType =
  | "Text"
  | "Textarea"
  | "Number"
  | "Checkbox"
  | "Date"
  | "Time";

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

// Social Media Suite types
export * from "./social";
