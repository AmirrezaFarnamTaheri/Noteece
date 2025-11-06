/**
 * React Query hooks for API calls
 * Provides caching, automatic refetching, and better state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormField, Task } from '@noteece/types';
import * as api from '../services/api';

// Query Keys for cache invalidation and refetching
export const queryKeys = {
  spaces: ['spaces'] as const,
  space: (id: string) => ['space', id] as const,
  notes: (spaceId: string) => ['notes', spaceId] as const,
  note: (id: string) => ['note', id] as const,
  tasks: (spaceId: string) => ['tasks', spaceId] as const,
  task: (id: string) => ['task', id] as const,
  projects: (spaceId: string) => ['projects', spaceId] as const,
  project: (id: string) => ['project', id] as const,
  tags: (spaceId: string) => ['tags', spaceId] as const,
  analytics: ['analytics'] as const,
  formTemplates: (spaceId: string) => ['formTemplates', spaceId] as const,
  projectRisks: (projectId: string) => ['projectRisks', projectId] as const,
  projectMilestones: (projectId: string) => ['projectMilestones', projectId] as const,
  upcomingTasks: (spaceId: string, limit: number) => ['upcomingTasks', spaceId, limit] as const,
  recentNotes: (spaceId: string, limit: number) => ['recentNotes', spaceId, limit] as const,
  dailyNote: (spaceId: string) => ['dailyNote', spaceId] as const,
};

// ============================================
// SPACES
// ============================================

export function useSpaces() {
  return useQuery({
    queryKey: queryKeys.spaces,
    queryFn: api.getAllSpaces,
  });
}

// ============================================
// NOTES
// ============================================

export function useNotes(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notes(spaceId),
    queryFn: () => api.getAllNotesInSpace(spaceId),
    enabled: enabled && !!spaceId,
  });
}

export function useRecentNotes(spaceId: string, limit = 10, enabled = true) {
  return useQuery({
    queryKey: queryKeys.recentNotes(spaceId, limit),
    queryFn: () => api.getRecentNotes(spaceId, limit),
    enabled: enabled && !!spaceId,
  });
}

export function useDailyNote(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dailyNote(spaceId),
    queryFn: () => api.getOrCreateDailyNote(spaceId),
    enabled: enabled && !!spaceId,
  });
}

// ============================================
// TASKS
// ============================================

export function useTasks(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks(spaceId),
    queryFn: () => api.getAllTasksInSpace(spaceId),
    enabled: enabled && !!spaceId,
  });
}

export function useUpcomingTasks(spaceId: string, limit = 10, enabled = true) {
  return useQuery({
    queryKey: queryKeys.upcomingTasks(spaceId, limit),
    queryFn: () => api.getUpcomingTasks(spaceId, limit),
    enabled: enabled && !!spaceId,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Task) => api.updateTask(task),
    onSuccess: (_, variables) => {
      // Invalidate single task cache
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.id) });

      // Invalidate task-related queries for the specific space
      if (variables.space_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.space_id) });
        // Invalidate common upcomingTasks limits
        for (const limit of [5, 10, 20]) {
          queryClient.invalidateQueries({ queryKey: queryKeys.upcomingTasks(variables.space_id, limit) });
        }
      }
    },
  });
}

// ============================================
// PROJECTS
// ============================================

export function useProjects(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projects(spaceId),
    queryFn: () => api.getAllProjectsInSpace(spaceId),
    enabled: enabled && !!spaceId,
  });
}

export function useProjectRisks(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectRisks(projectId),
    queryFn: () => api.getProjectRisks(projectId),
    enabled: enabled && !!projectId,
  });
}

export function useProjectMilestones(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectMilestones(projectId),
    queryFn: () => api.getProjectMilestones(projectId),
    enabled: enabled && !!projectId,
  });
}

export function useCreateProjectRisk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      description,
      likelihood,
      impact,
    }: {
      projectId: string;
      description: string;
      likelihood: string;
      impact: string;
    }) => api.createProjectRisk(projectId, description, likelihood, impact),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectRisks(variables.projectId),
      });
    },
  });
}

// ============================================
// TAGS
// ============================================

export function useTags(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tags(spaceId),
    queryFn: () => api.getAllTagsInSpace(spaceId),
    enabled: enabled && !!spaceId,
  });
}

// ============================================
// ANALYTICS
// ============================================

export function useAnalytics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: api.getAnalyticsData,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics
  });
}

// ============================================
// FORM TEMPLATES
// ============================================

export function useFormTemplates(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.formTemplates(spaceId),
    queryFn: () => api.getFormTemplatesForSpace(spaceId),
    enabled: enabled && !!spaceId,
  });
}

export function useCreateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ spaceId, name, fields }: { spaceId: string; name: string; fields: FormField[] }) =>
      api.createFormTemplate(spaceId, name, fields),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.formTemplates(variables.spaceId),
      });
    },
  });
}

export function useUpdateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, fields }: { id: string; name: string; fields: FormField[]; spaceId: string }) =>
      api.updateFormTemplate(id, name, fields),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formTemplates(variables.spaceId) });
    },
  });
}

export function useDeleteFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; spaceId: string }) => api.deleteFormTemplate(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formTemplates(variables.spaceId) });
    },
  });
}

// ============================================
// PREFETCH UTILITIES
// ============================================

/**
 * Prefetch all essential data for a space
 * Useful when switching spaces to improve perceived performance
 */
export function usePrefetchSpace() {
  const queryClient = useQueryClient();

  return (spaceId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.notes(spaceId),
      queryFn: () => api.getAllNotesInSpace(spaceId),
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks(spaceId),
      queryFn: () => api.getAllTasksInSpace(spaceId),
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.projects(spaceId),
      queryFn: () => api.getAllProjectsInSpace(spaceId),
    });

    queryClient.prefetchQuery({
      queryKey: queryKeys.tags(spaceId),
      queryFn: () => api.getAllTagsInSpace(spaceId),
    });
  };
}
