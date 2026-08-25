/**
 * Optimized Query Hooks
 *
 * Provides granular Tauri invocations with minimal data transfer.
 * Uses TanStack Query for caching and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import type { DashboardStats } from '@noteece/types';
import { logger } from '@/utils/logger';
import { queryKeys } from './queryKeys';

/**
 * Task summary for list views (minimal data)
 */
export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority?: number;
  due_date?: number;
}

/**
 * Full task details (loaded on demand)
 */
export interface TaskDetails extends TaskSummary {
  description?: string;
  note_id?: string;
  project_id?: string;
  parent_task_id?: string;
  completed_at?: number;
  created_at: number;
  updated_at: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Note summary for list views
 */
export interface NoteSummary {
  id: string;
  title: string;
  space_id: string;
  created_at: number;
  updated_at: number;
  is_pinned: boolean;
}

/**
 * Full note details
 */
export interface NoteDetails extends NoteSummary {
  content_md: string;
  content_html?: string;
  tags?: string[];
  backlinks?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Hook for fetching task summaries (optimized for list views)
 */
export function useTaskSummaries(spaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.summaries(spaceId || ''),
    queryFn: async (): Promise<TaskSummary[]> => {
      if (!spaceId) return [];
      try {
        return await invoke('get_task_summaries_cmd', { spaceId });
      } catch (error) {
        logger.error('Failed to fetch task summaries', error as Error);
        throw error;
      }
    },
    enabled: !!spaceId,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Hook for fetching full task details (loaded on demand)
 */
export function useTaskDetails(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId || ''),
    queryFn: async (): Promise<TaskDetails | null> => {
      if (!taskId) return null;
      try {
        return await invoke('get_task_cmd', { taskId });
      } catch (error) {
        logger.error('Failed to fetch task details', error as Error);
        throw error;
      }
    },
    enabled: !!taskId,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Hook for fetching note summaries
 */
export function useNoteSummaries(spaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.summaries(spaceId || ''),
    queryFn: async (): Promise<NoteSummary[]> => {
      if (!spaceId) return [];
      try {
        return await invoke('get_note_summaries_cmd', { spaceId });
      } catch (error) {
        logger.error('Failed to fetch note summaries', error as Error);
        throw error;
      }
    },
    enabled: !!spaceId,
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching full note details
 */
export function useNoteDetails(noteId: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.detail(noteId || ''),
    queryFn: async (): Promise<NoteDetails | null> => {
      if (!noteId) return null;
      try {
        return await invoke('get_note_cmd', { noteId });
      } catch (error) {
        logger.error('Failed to fetch note details', error as Error);
        throw error;
      }
    },
    enabled: !!noteId,
    staleTime: 60_000,
  });
}

/**
 * Hook for fetching dashboard statistics (cached summary data)
 */
export function useDashboardStats(spaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.stats.dashboard(spaceId || ''),
    queryFn: async (): Promise<DashboardStats> => {
      if (!spaceId) {
        return {
          total_notes: 0,
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          overdue_tasks: 0,
          total_projects: 0,
          active_habits: 0,
          streak_days: 0,
          health: { metrics_count: 0, latest_metric: null },
          music: { track_count: 0, playlist_count: 0 },
          social: { posts_count: 0, platforms_count: 0 },
          tasks: { pending_count: 0, completed_count: 0 },
          quote: null,
        };
      }
      try {
        return await invoke('get_dashboard_stats_cmd', { spaceId });
      } catch (error) {
        logger.error('Failed to fetch dashboard stats', error as Error);
        throw error;
      }
    },
    enabled: !!spaceId,
    staleTime: 60_000, // 1 minute - stats don't need real-time updates
    refetchInterval: 300_000, // Refresh every 5 minutes
  });
}

/**
 * Hook for updating a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Partial<TaskDetails> & { id: string }) => {
      return await invoke('update_task_cmd', { task });
    },
    onSuccess: (_data, variables) => {
      // Invalidate specific task detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(variables.id),
      });
      // Invalidate task lists (summaries will reflect changes)
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.lists(),
      });
    },
    onError: (error) => {
      logger.error('Failed to update task', error);
    },
  });
}

/**
 * Hook for creating a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { spaceId: string; title: string; description?: string }) => {
      return await invoke('create_task_cmd', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.all,
      });
    },
    onError: (error) => {
      logger.error('Failed to create task', error);
    },
  });
}

/**
 * Hook for batch operations on tasks
 */
export function useBatchUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { taskIds: string[]; updates: Partial<TaskDetails> }) => {
      return await invoke('batch_update_tasks_cmd', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.all,
      });
    },
    onError: (error) => {
      logger.error('Failed to batch update tasks', error);
    },
  });
}

export { queryKeys } from './queryKeys';
