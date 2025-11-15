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
} from '@noteece/types';

export const getAnalyticsData = (): Promise<AnalyticsData> => {
  return invoke('get_analytics_data_cmd', {});
};

export const getFormTemplatesForSpace = (spaceId: string): Promise<FormTemplate[]> => {
  return invoke('get_form_templates_for_space', { spaceId });
};

export const createFormTemplate = (spaceId: string, name: string, fields: FormField[]): Promise<FormTemplate> => {
  return invoke('create_form_template', { spaceId, name, fields });
};

export const updateFormTemplate = (id: string, name: string, fields: FormField[]): Promise<void> => {
  return invoke('update_form_template', { id, name, fields });
};

export const deleteFormTemplate = (id: string): Promise<void> => {
  return invoke('delete_form_template', { id });
};

export const getProjectRisks = (projectId: string): Promise<ProjectRisk[]> => {
  return invoke('get_project_risks_cmd', { projectId });
};

export const createProjectRisk = (
  projectId: string,
  description: string,
  likelihood: string,
  impact: string,
): Promise<ProjectRisk> => {
  return invoke('create_project_risk_cmd', { projectId, description, likelihood, impact });
};

export const getProjectMilestones = (projectId: string): Promise<ProjectMilestone[]> => {
  return invoke('get_project_milestones_cmd', { projectId });
};

export const getAllTasksInSpace = (spaceId: string): Promise<Task[]> => {
  return invoke('get_all_tasks_in_space_cmd', { spaceId });
};

export const getAllNotesInSpace = (spaceId: string): Promise<Note[]> => {
  return invoke('get_all_notes_in_space_cmd', { spaceId });
};

export const getAllProjectsInSpace = (spaceId: string): Promise<Project[]> => {
  return invoke('get_all_projects_cmd', { spaceId });
};

export const getOrCreateDailyNote = (spaceId: string): Promise<Note> => {
  return invoke('get_or_create_daily_note_cmd', { spaceId });
};

export const getAllSpaces = (): Promise<Space[]> => {
  return invoke('get_all_spaces_cmd');
};

export const getAllTagsInSpace = (spaceId: string): Promise<Tag[]> => {
  return invoke('get_all_tags_in_space_cmd', { spaceId });
};

export const getUpcomingTasks = (spaceId: string, limit: number): Promise<Task[]> => {
  return invoke('get_upcoming_tasks_cmd', { spaceId, limit });
};

export const getRecentNotes = (spaceId: string, limit: number): Promise<Note[]> => {
  return invoke('get_recent_notes_cmd', { spaceId, limit });
};

export const updateTask = (task: Task): Promise<void> => {
  return invoke('update_task_cmd', { task });
};

// Time Tracking API

export const startTimeEntry = (
  spaceId: string,
  taskId?: string,
  projectId?: string,
  noteId?: string,
  description?: string,
): Promise<TimeEntry> => {
  return invoke('start_time_entry_cmd', {
    spaceId,
    taskId: taskId || null,
    projectId: projectId || null,
    noteId: noteId || null,
    description: description || null,
  });
};

export const stopTimeEntry = (entryId: string): Promise<TimeEntry> => {
  return invoke('stop_time_entry_cmd', { entryId });
};

export const getTaskTimeEntries = (taskId: string): Promise<TimeEntry[]> => {
  return invoke('get_task_time_entries_cmd', { taskId });
};

export const getProjectTimeEntries = (projectId: string): Promise<TimeEntry[]> => {
  return invoke('get_project_time_entries_cmd', { projectId });
};

export const getRunningEntries = (spaceId: string): Promise<TimeEntry[]> => {
  return invoke('get_running_entries_cmd', { spaceId });
};

export const getRecentTimeEntries = (spaceId: string, limit: number): Promise<TimeEntry[]> => {
  return invoke('get_recent_time_entries_cmd', { spaceId, limit });
};

export const getTaskTimeStats = (taskId: string): Promise<TimeStats> => {
  return invoke('get_task_time_stats_cmd', { taskId });
};

export const getProjectTimeStats = (projectId: string): Promise<TimeStats> => {
  return invoke('get_project_time_stats_cmd', { projectId });
};

export const deleteTimeEntry = (entryId: string): Promise<void> => {
  return invoke('delete_time_entry_cmd', { entryId });
};

export const createManualTimeEntry = (
  spaceId: string,
  taskId: string | undefined,
  projectId: string | undefined,
  noteId: string | undefined,
  description: string | undefined,
  startedAt: number,
  durationSeconds: number,
): Promise<TimeEntry> => {
  return invoke('create_manual_time_entry_cmd', {
    spaceId,
    taskId: taskId || null,
    projectId: projectId || null,
    noteId: noteId || null,
    description: description || null,
    startedAt,
    durationSeconds,
  });
};
