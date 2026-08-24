/**
 * Shared Query Keys for React Query cache management
 * Centralizes all query key definitions to prevent cache invalidation drift
 */

export const queryKeys = {
  spaces: ['spaces'] as const,
  space: (id: string) => ['space', id] as const,
  notes: {
    all: ['notes'] as const,
    lists: () => [...queryKeys.notes.all, 'list'] as const,
    list: (spaceId: string) => [...queryKeys.notes.lists(), spaceId] as const,
    summaries: (spaceId: string) => [...queryKeys.notes.list(spaceId), 'summary'] as const,
    details: () => [...queryKeys.notes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.notes.details(), id] as const,
    bySpace: (spaceId: string) => ['notes', spaceId] as const,
    recent: (spaceId: string, limit: number) => ['recentNotes', spaceId, limit] as const,
    daily: (spaceId: string) => ['dailyNote', spaceId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (spaceId: string) => [...queryKeys.tasks.lists(), spaceId] as const,
    summaries: (spaceId: string) => [...queryKeys.tasks.list(spaceId), 'summary'] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    bySpace: (spaceId: string) => ['tasks', spaceId] as const,
    upcoming: (spaceId: string, limit: number) => ['upcomingTasks', spaceId, limit] as const,
  },
  projects: {
    all: ['projects'] as const,
    bySpace: (spaceId: string) => ['projects', spaceId] as const,
    detail: (id: string) => ['project', id] as const,
    risks: (projectId: string) => ['projectRisks', projectId] as const,
    milestones: (projectId: string) => ['projectMilestones', projectId] as const,
  },
  tags: (spaceId: string) => ['tags', spaceId] as const,
  analytics: ['analytics'] as const,
  formTemplates: (spaceId: string) => ['formTemplates', spaceId] as const,
  stats: {
    all: ['stats'] as const,
    dashboard: (spaceId: string) => [...queryKeys.stats.all, 'dashboard', spaceId] as const,
    tasks: (spaceId: string) => [...queryKeys.stats.all, 'tasks', spaceId] as const,
  },
};
