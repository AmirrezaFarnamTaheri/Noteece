// packages/types/src/index.ts

import { z } from 'zod';

export type ULID = string;

export const ulidSchema = z.string().min(1);

export const SpaceSchema = z.object({
  id: ulidSchema,
  name: z.string(),
  icon: z.string().optional(),
  enabled_modes_json: z.string(),
});
export type Space = z.infer<typeof SpaceSchema>;

export const NoteSchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema,
  title: z.string(),
  content_md: z.string(),
  created_at: z.number(),
  modified_at: z.number(),
  is_trashed: z.boolean(),
});
export type Note = z.infer<typeof NoteSchema>;

export const TaskStatusSchema = z.enum(['inbox', 'next', 'in_progress', 'waiting', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema,
  note_id: ulidSchema.optional(),
  project_id: ulidSchema.optional(),
  parent_task_id: ulidSchema.optional(),
  title: z.string(),
  description: z.string().optional(),
  status: TaskStatusSchema,
  due_at: z.number().optional(),
  start_at: z.number().optional(),
  completed_at: z.number().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  estimate_minutes: z.number().optional(),
  recur_rule: z.string().optional(),
  context: z.string().optional(),
  area: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const ProjectStatusSchema = z.enum(['proposed', 'active', 'blocked', 'done', 'archived']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema,
  title: z.string(),
  goal_outcome: z.string().optional(),
  status: ProjectStatusSchema,
  confidence: z.number().optional(),
  start_at: z.number().optional(),
  target_end_at: z.number().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const TagSchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema,
  name: z.string(),
  color: z.string().optional(),
});
export type Tag = z.infer<typeof TagSchema>;

export const PersonSchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema.optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  org: z.string().optional(),
});
export type Person = z.infer<typeof PersonSchema>;

export const ProjectMilestoneSchema = z.object({
  id: ulidSchema,
  project_id: ulidSchema,
  title: z.string(),
  due_at: z.number().optional(),
  status: z.string().optional(),
});
export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>;

export const ProjectRiskSchema = z.object({
  id: ulidSchema,
  project_id: ulidSchema,
  description: z.string(),
  impact: z.string().optional(),
  likelihood: z.string().optional(),
  mitigation: z.string().optional(),
  owner_person_id: ulidSchema.optional(),
});
export type ProjectRisk = z.infer<typeof ProjectRiskSchema>;

export const ProjectUpdateSchema = z.object({
  id: ulidSchema,
  project_id: ulidSchema,
  when_at: z.number(),
  health: z.enum(['green', 'amber', 'red']).optional(),
  summary: z.string(),
});
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

export const SearchScopeSchema = z.enum(['note', 'project', 'space', 'vault_all']);
export type SearchScope = z.infer<typeof SearchScopeSchema>;

export const SavedSearchSchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema,
  title: z.string(),
  query_string: z.string(),
  scope: SearchScopeSchema,
});
export type SavedSearch = z.infer<typeof SavedSearchSchema>;

export const KnowledgeCardStateSchema = z.enum(['new', 'learning', 'review', 'relearning']);
export type KnowledgeCardState = z.infer<typeof KnowledgeCardStateSchema>;

export const KnowledgeCardSchema = z.object({
  id: ulidSchema,
  note_id: ulidSchema,
  deck_id: z.string().optional(),
  state: KnowledgeCardStateSchema,
  due_at: z.number(),
  stability: z.number(),
  difficulty: z.number(),
  lapses: z.number(),
  revision_history_json: z.string(),
});
export type KnowledgeCard = z.infer<typeof KnowledgeCardSchema>;

export const ReviewLogSchema = z.object({
  id: ulidSchema,
  card_id: ulidSchema,
  review_at: z.number(),
  rating: z.number(),
  state: z.string(),
  due_at: z.number(),
  stability: z.number(),
  difficulty: z.number(),
  lapses: z.number(),
});
export type ReviewLog = z.infer<typeof ReviewLogSchema>;

export const FormFieldTypeSchema = z.enum(['Text', 'Textarea', 'Number', 'Checkbox', 'Date', 'Time']);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

export const FormFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  field_type: FormFieldTypeSchema,
  default_value: z.string().optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormTemplateSchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema,
  name: z.string(),
  fields: z.array(FormFieldSchema),
});
export type FormTemplate = z.infer<typeof FormTemplateSchema>;

export const WeeklyCountSchema = z.object({
  week: z.string(),
  count: z.number(),
});
export type WeeklyCount = z.infer<typeof WeeklyCountSchema>;

export const AnalyticsDataSchema = z.object({
  note_count: z.number(),
  task_count: z.number(),
  project_count: z.number(),
  tasks_completed_by_week: z.array(WeeklyCountSchema),
  notes_created_by_week: z.array(WeeklyCountSchema),
});
export type AnalyticsData = z.infer<typeof AnalyticsDataSchema>;

export const TimeEntrySchema = z.object({
  id: ulidSchema,
  space_id: ulidSchema,
  task_id: ulidSchema.optional(),
  project_id: ulidSchema.optional(),
  note_id: ulidSchema.optional(),
  description: z.string().optional(),
  started_at: z.number(),
  ended_at: z.number().optional(),
  duration_seconds: z.number().optional(),
  is_running: z.boolean(),
});
export type TimeEntry = z.infer<typeof TimeEntrySchema>;

export const TimeStatsSchema = z.object({
  total_seconds: z.number(),
  entry_count: z.number(),
  average_seconds: z.number(),
});
export type TimeStats = z.infer<typeof TimeStatsSchema>;

export const SyncTaskSchema = z.object({
  id: z.string(),
  device_id: z.string(),
  space_id: z.string(),
  direction: z.string(),
  status: z.string(),
  progress: z.number(),
  created_at: z.number(),
});
export type SyncTask = z.infer<typeof SyncTaskSchema>;

export const SyncStatsSchema = z.object({
  total_synced: z.number(),
  last_sync_at: z.number().nullable(),
  success_rate: z.number(),
  conflicts_total: z.number(),
});
export type SyncStats = z.infer<typeof SyncStatsSchema>;

export const DeviceInfoSchema = z.object({
  device_id: z.string(),
  device_name: z.string(),
  device_type: z.enum(['Desktop', 'Mobile', 'Web']),
  last_seen: z.number(),
  sync_address: z.string(),
  sync_port: z.number(),
  protocol_version: z.string(),
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

export const DiscoveredDeviceSchema = z.object({
  device_id: z.string(),
  device_name: z.string(),
  device_type: z.enum(['Desktop', 'Mobile', 'Tablet']),
  ip_address: z.string(),
  sync_port: z.number(),
  os_version: z.string(),
  last_seen: z.string(),
});
export type DiscoveredDevice = z.infer<typeof DiscoveredDeviceSchema>;

export const ConflictTypeSchema = z.enum(['UpdateUpdate', 'DeleteUpdate', 'UpdateDelete']);
export type ConflictType = z.infer<typeof ConflictTypeSchema>;

export const ConflictResolutionSchema = z.enum(['UseLocal', 'UseRemote', 'Merge']);
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;

export const SyncConflictSchema = z.object({
  entity_type: z.string(),
  entity_id: z.string(),
  local_version: z.array(z.number()),
  remote_version: z.array(z.number()),
  conflict_type: ConflictTypeSchema,
  space_id: z.string().optional(),
});
export type SyncConflict = z.infer<typeof SyncConflictSchema>;

export const HealthMetricSchema = z.object({
  id: z.string(),
  space_id: z.string(),
  metric_type: z.string(),
  value: z.number(),
  unit: z.string(),
  notes: z.string().optional(),
  recorded_at: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type HealthMetric = z.infer<typeof HealthMetricSchema>;

export const GoalSchema = z.object({
  id: z.string(),
  space_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  target: z.number(),
  current: z.number(),
  unit: z.string(),
  category: z.string(),
  start_date: z.number(),
  target_date: z.number().optional(),
  is_completed: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const HabitSchema = z.object({
  id: z.string(),
  space_id: z.string(),
  title: z.string(),
  frequency: z.string(),
  is_archived: z.boolean(),
  created_at: z.number(),
});
export type Habit = z.infer<typeof HabitSchema>;

export const TransactionSchema = z.object({
  id: z.string(),
  space_id: z.string(),
  transaction_type: z.string(),
  amount: z.number(),
  currency: z.string(),
  category: z.string(),
  account_id: z.string(),
  date: z.number(),
  description: z.string().optional(),
  created_at: z.number(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const RecipeSchema = z.object({
  id: z.string(),
  space_id: z.string(),
  note_id: z.string(),
  name: z.string(),
  rating: z.number(),
  difficulty: z.string(),
  created_at: z.number(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const TripSchema = z.object({
  id: z.string(),
  space_id: z.string(),
  note_id: z.string(),
  name: z.string(),
  destination: z.string(),
  start_date: z.number(),
  end_date: z.number(),
  created_at: z.number(),
});
export type Trip = z.infer<typeof TripSchema>;

export const GraphSnapshotSchema = z.object({
  space_id: z.string(),
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    node_type: z.string(),
    centrality: z.number(),
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    weight: z.number(),
  })),
  metrics: z.object({
    node_count: z.number(),
    edge_count: z.number(),
    density: z.number(),
    avg_clustering: z.number(),
  }),
  captured_at: z.number(),
});
export type GraphSnapshot = z.infer<typeof GraphSnapshotSchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  node_type: z.string(),
  centrality: z.number(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  weight: z.number(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphMetricsSchema = z.object({
  node_count: z.number(),
  edge_count: z.number(),
  density: z.number(),
  avg_clustering: z.number(),
});
export type GraphMetrics = z.infer<typeof GraphMetricsSchema>;

export const GraphMilestoneSchema = z.object({
  note_id: z.string(),
  title: z.string(),
  date: z.number(),
  importance: z.number(),
  reason: z.string(),
});
export type GraphMilestone = z.infer<typeof GraphMilestoneSchema>;

export const SpaceUserSchema = z.object({
  user_id: z.string(),
  role: z.string(),
  joined_at: z.number(),
});
export type SpaceUser = z.infer<typeof SpaceUserSchema>;

export const RoleSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string()),
});
export type Role = z.infer<typeof RoleSchema>;

export const WebViewSessionSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  cookies: z.string(),
  user_agent: z.string(),
});
export type WebViewSession = z.infer<typeof WebViewSessionSchema>;

export const AnalyticsOverviewSchema = z.object({
  total_posts: z.number(),
  total_engagement: z.number(),
  top_platform: z.string(),
});
export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;

export const BackupMetadataSchema = z.object({
  id: z.string(),
  space_id: z.string().optional(),
  created_at: z.number(),
  size_bytes: z.number(),
  file_count: z.number(),
  encrypted: z.boolean(),
});
export type BackupMetadata = z.infer<typeof BackupMetadataSchema>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  created_at: z.number(),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  token: z.string(),
  expires_at: z.number(),
  user_id: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;

export const SearchResultSchema = z.object({
  entity_type: z.string(),
  entity_id: z.string(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  score: z.number(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// Social Media Suite types
export * from './social';
export * from './dashboard';
