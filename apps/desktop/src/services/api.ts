// apps/desktop/src/services/api.ts

import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '../utils/logger';
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
  BackupMetadata,
  User,
  Session,
} from '@noteece/types';

// Generic wrapper for invoke to handle logging and secure parameter validation
async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const startTime = Date.now();
  try {
    // Basic validation to prevent null/undefined keys which might cause panic in Rust if unhandled
    if (args) {
      for (const [key, value] of Object.entries(args)) {
        if (!key || key.trim() === '') {
          throw new Error(`Invalid argument key for command ${cmd}`);
        }
        if (value === undefined) {
          throw new Error(`Argument '${key}' is undefined for command ${cmd}`);
        }
      }
    }

    logger.debug(`[API] Invoking ${cmd}`, args);
    const result = await invoke<T>(cmd, args);
    const duration = Date.now() - startTime;
    logger.debug(`[API] ${cmd} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[API] ${cmd} failed after ${duration}ms`,
      error instanceof Error ? error : { error }
    );
    throw error;
  }
}

// Dashboard & Analytics
export const getAnalyticsData = (): Promise<AnalyticsData> => invokeCmd('get_analytics_data_cmd', {});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDashboardStats = (spaceId: string): Promise<any> => invokeCmd('get_dashboard_stats_cmd', { spaceId }); // DashboardStats type needed

// Forms
export const getFormTemplatesForSpace = (spaceId: string): Promise<FormTemplate[]> =>
  invokeCmd('get_form_templates_for_space_cmd', { spaceId });
export const createFormTemplate = (spaceId: string, name: string, fields: FormField[]): Promise<FormTemplate> =>
  invokeCmd('create_form_template_cmd', { spaceId, name, fields });
export const updateFormTemplate = (id: string, name: string, fields: FormField[]): Promise<FormTemplate> =>
  invokeCmd('update_form_template_cmd', { id, name, fields });
export const deleteFormTemplate = (id: string): Promise<void> => invokeCmd('delete_form_template_cmd', { id });

// Projects
export const getProjectRisks = (projectId: string): Promise<ProjectRisk[]> =>
  invokeCmd('get_project_risks_cmd', { projectId });
export const createProjectRisk = (
  projectId: string,
  description: string,
  likelihood: string,
  impact: string,
): Promise<ProjectRisk> => invokeCmd('create_project_risk_cmd', { projectId, description, likelihood, impact });
export const getProjectMilestones = (projectId: string): Promise<ProjectMilestone[]> =>
  invokeCmd('get_project_milestones_cmd', { projectId });
export const getProjectUpdates = (projectId: string): Promise<ProjectUpdate[]> =>
  invokeCmd('get_project_updates_cmd', { projectId });
export const getAllProjectsInSpace = (spaceId: string): Promise<Project[]> =>
  invokeCmd('get_projects_in_space_cmd', { spaceId });

// Tasks & Notes
export const getAllTasksInSpace = (spaceId: string): Promise<Task[]> =>
  invokeCmd('get_all_tasks_in_space_cmd', { spaceId });
export const getAllNotesInSpace = (spaceId: string): Promise<Note[]> =>
  invokeCmd('get_all_notes_in_space_cmd', { spaceId });
export const getOrCreateDailyNote = (spaceId: string): Promise<Note> =>
  invokeCmd('get_or_create_daily_note_cmd', { spaceId });
export const getUpcomingTasks = (spaceId: string, limit: number): Promise<Task[]> =>
  invokeCmd('get_upcoming_tasks_cmd', { spaceId, limit });
export const getRecentNotes = (spaceId: string, limit: number): Promise<Note[]> =>
  invokeCmd('get_recent_notes_cmd', { spaceId, limit });
export const updateTask = (task: Task): Promise<void> => invokeCmd('update_task_cmd', { task });

// Spaces & Tags
export const getAllSpaces = (): Promise<Space[]> => invokeCmd('get_all_spaces_cmd');
export const getAllTagsInSpace = (spaceId: string): Promise<Tag[]> =>
  invokeCmd('get_all_tags_in_space_cmd', { spaceId });

// Time Tracking
export const startTimeEntry = (
  spaceId: string,
  taskId?: string,
  projectId?: string,
  noteId?: string,
  description?: string,
): Promise<TimeEntry> =>
  invokeCmd('start_time_entry_cmd', {
    spaceId,
    taskId: taskId || null,
    projectId: projectId || null,
    noteId: noteId || null,
    description: description || null,
  });

export const stopTimeEntry = (entryId: string): Promise<TimeEntry> => invokeCmd('stop_time_entry_cmd', { entryId });
export const getTaskTimeEntries = (taskId: string): Promise<TimeEntry[]> =>
  invokeCmd('get_task_time_entries_cmd', { taskId });
export const getProjectTimeEntries = (projectId: string): Promise<TimeEntry[]> =>
  invokeCmd('get_project_time_entries_cmd', { projectId });
export const getRunningEntries = (spaceId: string): Promise<TimeEntry[]> =>
  invokeCmd('get_running_entries_cmd', { spaceId });
export const getRecentTimeEntries = (spaceId: string, limit: number): Promise<TimeEntry[]> =>
  invokeCmd('get_recent_time_entries_cmd', { spaceId, limit });
export const getTaskTimeStats = (taskId: string): Promise<TimeStats> =>
  invokeCmd('get_task_time_stats_cmd', { taskId });
export const getProjectTimeStats = (projectId: string): Promise<TimeStats> =>
  invokeCmd('get_project_time_stats_cmd', { projectId });
export const deleteTimeEntry = (entryId: string): Promise<void> => invokeCmd('delete_time_entry_cmd', { entryId });
export const createManualTimeEntry = (
  spaceId: string,
  taskId: string | undefined,
  projectId: string | undefined,
  noteId: string | undefined,
  description: string | undefined,
  startedAt: number,
  durationSeconds: number,
): Promise<TimeEntry> =>
  invokeCmd('create_manual_time_entry_cmd', {
    spaceId,
    taskId: taskId || null,
    projectId: projectId || null,
    noteId: noteId || null,
    description: description || null,
    started_at: startedAt,
    duration_seconds: durationSeconds,
  });

// P2P Sync
export const startSyncServer = (): Promise<void> => invokeCmd('start_sync_server_cmd');
export const startP2pSync = (deviceId: string): Promise<void> => invokeCmd('start_p2p_sync_cmd', { deviceId });
export const discoverDevices = (): Promise<DiscoveredDevice[]> => invokeCmd('discover_devices_cmd');
export const initiatePairing = (deviceId: string): Promise<void> => invokeCmd('initiate_pairing_cmd', { deviceId });
export const getDevices = (): Promise<DeviceInfo[]> => invokeCmd('get_devices_cmd');
export const getSyncConflicts = (): Promise<SyncConflict[]> => invokeCmd('get_sync_conflicts_cmd');
export const resolveSyncConflict = (conflict: SyncConflict, resolution: ConflictResolution): Promise<void> =>
  invokeCmd('resolve_sync_conflict_cmd', { conflict, resolution });
export const exchangeKeys = (deviceId: string): Promise<void> => invokeCmd('exchange_keys_cmd', { deviceId });
export const getSyncProgress = (deviceId: string): Promise<number> => invokeCmd('get_sync_progress_cmd', { deviceId });
export const shutdownClearKeys = (): Promise<void> => invokeCmd('shutdown_clear_keys_cmd');
export const getAllSyncTasks = (spaceId: string): Promise<SyncTask[]> =>
  invokeCmd('get_all_sync_tasks_cmd', { spaceId });
export const getSyncStats = (spaceId: string): Promise<SyncStats> => invokeCmd('get_sync_stats_cmd', { spaceId });

// Backup
export const createBackup = (spaceId: string): Promise<BackupMetadata> => invokeCmd('create_backup_cmd', { spaceId });
export const restoreBackup = (backupId: string): Promise<void> => invokeCmd('restore_backup_cmd', { backupId });
export const listBackups = (spaceId: string): Promise<BackupMetadata[]> => invokeCmd('list_backups_cmd', { spaceId });
export const getBackupDetails = (backupId: string): Promise<BackupMetadata> =>
  invokeCmd('get_backup_details_cmd', { backupId });
export const deleteBackup = (backupId: string): Promise<void> => invokeCmd('delete_backup_cmd', { backupId });

// Auth
export const createUser = (username: string, email: string, password: string): Promise<User> =>
  invokeCmd('create_user_cmd', { username, email, password });
export const authenticateUser = (username: string, password: string): Promise<Session> =>
  invokeCmd('authenticate_user_cmd', { username, password });
export const logoutUser = (token: string): Promise<void> => invokeCmd('logout_user_cmd', { token });
export const getCurrentUser = (token: string): Promise<User> => invokeCmd('get_current_user_cmd', { token });
