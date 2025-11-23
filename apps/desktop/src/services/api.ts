// apps/desktop/src/services/api.ts

import { invoke } from '@tauri-apps/api/tauri';
import {
  AnalyticsData,
  FormTemplate,
  FormField,
  Task,
  Project,
  Note,
  Space,
  Tag,
  ProjectRisk,
  ProjectMilestone,
  TimeEntry,
  TimeStats,
  SyncTask,
  SyncStats,
  DeviceInfo,
  DiscoveredDevice,
  SyncConflict,
  ConflictResolution,
  ProjectUpdate,
  SavedSearch,
  SearchResult,
  KnowledgeCard,
  HealthMetric,
  Goal,
  Habit,
  Transaction,
  Recipe,
  Trip,
  GraphSnapshot,
  GraphMilestone,
  SpaceUser,
  Role,
  SocialAccount,
  SocialPost,
  TimelinePost,
  TimelineStats,
  SocialCategory,
  WebViewSession,
  AnalyticsOverview,
  BackupMetadata,
  User,
  Session,
} from '@noteece/types';

// Dashboard & Analytics
export const getAnalyticsData = (): Promise<AnalyticsData> => invoke('get_analytics_data_cmd', {});
export const getDashboardStats = (spaceId: string): Promise<any> => invoke('get_dashboard_stats_cmd', { spaceId }); // DashboardStats type needed

// Forms
export const getFormTemplatesForSpace = (spaceId: string): Promise<FormTemplate[]> => invoke('get_form_templates_for_space_cmd', { spaceId });
export const createFormTemplate = (spaceId: string, name: string, fields: FormField[]): Promise<FormTemplate> => invoke('create_form_template_cmd', { spaceId, name, fields });
export const updateFormTemplate = (id: string, name: string, fields: FormField[]): Promise<FormTemplate> => invoke('update_form_template_cmd', { id, name, fields });
export const deleteFormTemplate = (id: string): Promise<void> => invoke('delete_form_template_cmd', { id });

// Projects
export const getProjectRisks = (projectId: string): Promise<ProjectRisk[]> => invoke('get_project_risks_cmd', { projectId });
export const createProjectRisk = (projectId: string, description: string, likelihood: string, impact: string): Promise<ProjectRisk> => invoke('create_project_risk_cmd', { projectId, description, likelihood, impact });
export const getProjectMilestones = (projectId: string): Promise<ProjectMilestone[]> => invoke('get_project_milestones_cmd', { projectId });
export const getProjectUpdates = (projectId: string): Promise<ProjectUpdate[]> => invoke('get_project_updates_cmd', { projectId });
export const getAllProjectsInSpace = (spaceId: string): Promise<Project[]> => invoke('get_projects_in_space_cmd', { spaceId });

// Tasks & Notes
export const getAllTasksInSpace = (spaceId: string): Promise<Task[]> => invoke('get_all_tasks_in_space_cmd', { spaceId });
export const getAllNotesInSpace = (spaceId: string): Promise<Note[]> => invoke('get_all_notes_in_space_cmd', { spaceId });
export const getOrCreateDailyNote = (spaceId: string): Promise<Note> => invoke('get_or_create_daily_note_cmd', { spaceId });
export const getUpcomingTasks = (spaceId: string, limit: number): Promise<Task[]> => invoke('get_upcoming_tasks_cmd', { spaceId, limit });
export const getRecentNotes = (spaceId: string, limit: number): Promise<Note[]> => invoke('get_recent_notes_cmd', { spaceId, limit });
export const updateTask = (task: Task): Promise<void> => invoke('update_task_cmd', { task });

// Spaces & Tags
export const getAllSpaces = (): Promise<Space[]> => invoke('get_all_spaces_cmd');
export const getAllTagsInSpace = (spaceId: string): Promise<Tag[]> => invoke('get_all_tags_in_space_cmd', { spaceId });

// Time Tracking
export const startTimeEntry = (spaceId: string, taskId?: string, projectId?: string, noteId?: string, description?: string): Promise<TimeEntry> =>
  invoke('start_time_entry_cmd', { spaceId, taskId: taskId || null, projectId: projectId || null, noteId: noteId || null, description: description || null });

export const stopTimeEntry = (entryId: string): Promise<TimeEntry> => invoke('stop_time_entry_cmd', { entryId });
export const getTaskTimeEntries = (taskId: string): Promise<TimeEntry[]> => invoke('get_task_time_entries_cmd', { taskId });
export const getProjectTimeEntries = (projectId: string): Promise<TimeEntry[]> => invoke('get_project_time_entries_cmd', { projectId });
export const getRunningEntries = (spaceId: string): Promise<TimeEntry[]> => invoke('get_running_entries_cmd', { spaceId });
export const getRecentTimeEntries = (spaceId: string, limit: number): Promise<TimeEntry[]> => invoke('get_recent_time_entries_cmd', { spaceId, limit });
export const getTaskTimeStats = (taskId: string): Promise<TimeStats> => invoke('get_task_time_stats_cmd', { taskId });
export const getProjectTimeStats = (projectId: string): Promise<TimeStats> => invoke('get_project_time_stats_cmd', { projectId });
export const deleteTimeEntry = (entryId: string): Promise<void> => invoke('delete_time_entry_cmd', { entryId });
export const createManualTimeEntry = (
  spaceId: string, taskId: string | undefined, projectId: string | undefined, noteId: string | undefined, description: string | undefined, startedAt: number, durationSeconds: number
): Promise<TimeEntry> => invoke('create_manual_time_entry_cmd', {
    spaceId, taskId: taskId || null, projectId: projectId || null, noteId: noteId || null, description: description || null, started_at: startedAt, duration_seconds: durationSeconds,
});

// P2P Sync
export const startSyncServer = (): Promise<void> => invoke('start_sync_server_cmd');
export const startP2pSync = (deviceId: string): Promise<void> => invoke('start_p2p_sync_cmd', { deviceId });
export const discoverDevices = (): Promise<DiscoveredDevice[]> => invoke('discover_devices_cmd');
export const initiatePairing = (deviceId: string): Promise<void> => invoke('initiate_pairing_cmd', { deviceId });
export const getDevices = (): Promise<DeviceInfo[]> => invoke('get_devices_cmd');
export const getSyncConflicts = (): Promise<SyncConflict[]> => invoke('get_sync_conflicts_cmd');
export const resolveSyncConflict = (conflict: SyncConflict, resolution: ConflictResolution): Promise<void> => invoke('resolve_sync_conflict_cmd', { conflict, resolution });
export const exchangeKeys = (deviceId: string): Promise<void> => invoke('exchange_keys_cmd', { deviceId });
export const getSyncProgress = (deviceId: string): Promise<number> => invoke('get_sync_progress_cmd', { deviceId });
export const shutdownClearKeys = (): Promise<void> => invoke('shutdown_clear_keys_cmd');
export const getAllSyncTasks = (spaceId: string): Promise<SyncTask[]> => invoke('get_all_sync_tasks_cmd', { spaceId });
export const getSyncStats = (spaceId: string): Promise<SyncStats> => invoke('get_sync_stats_cmd', { spaceId });

// Backup
export const createBackup = (spaceId: string): Promise<BackupMetadata> => invoke('create_backup_cmd', { spaceId });
export const restoreBackup = (backupId: string): Promise<void> => invoke('restore_backup_cmd', { backupId });
export const listBackups = (spaceId: string): Promise<BackupMetadata[]> => invoke('list_backups_cmd', { spaceId });
export const getBackupDetails = (backupId: string): Promise<BackupMetadata> => invoke('get_backup_details_cmd', { backupId });
export const deleteBackup = (backupId: string): Promise<void> => invoke('delete_backup_cmd', { backupId });

// Auth
export const createUser = (username: string, email: string, password: string): Promise<User> => invoke('create_user_cmd', { username, email, password });
export const authenticateUser = (username: string, password: string): Promise<Session> => invoke('authenticate_user_cmd', { username, password });
export const logoutUser = (token: string): Promise<void> => invoke('logout_user_cmd', { token });
export const getCurrentUser = (token: string): Promise<User> => invoke('get_current_user_cmd', { token });
