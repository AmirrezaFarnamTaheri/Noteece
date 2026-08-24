import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createElement } from 'react';

const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

import { useSpaces, useNotes, useTasks, useProjects, useTags, useAnalytics } from '../useQueries';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // No JSX here: this is a .ts file, so build the provider element directly.
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useQueries hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSpaces', () => {
    it('fetches spaces successfully', async () => {
      const mockSpaces = [{ id: '1', name: 'Test Space' }];
      mockInvoke.mockResolvedValue(mockSpaces);

      const { result } = renderHook(() => useSpaces(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSpaces);
    });

    it('handles error state', async () => {
      mockInvoke.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useSpaces(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useNotes', () => {
    it('fetches notes for a space', async () => {
      const mockNotes = [{ id: '1', title: 'Note 1', content_md: 'Hello' }];
      mockInvoke.mockResolvedValue(mockNotes);

      const { result } = renderHook(() => useNotes('space-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockNotes);
    });

    it('is disabled when spaceId is empty', () => {
      const { result } = renderHook(() => useNotes(''), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useTasks', () => {
    it('fetches tasks for a space', async () => {
      const mockTasks = [{ id: '1', title: 'Task 1', status: 'inbox' }];
      mockInvoke.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTasks('space-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockTasks);
    });

    it('is disabled when spaceId is empty', () => {
      const { result } = renderHook(() => useTasks(''), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useProjects', () => {
    it('fetches projects for a space', async () => {
      const mockProjects = [{ id: '1', title: 'Project 1', status: 'active' }];
      mockInvoke.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useProjects('space-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProjects);
    });
  });

  describe('useTags', () => {
    it('fetches tags for a space', async () => {
      const mockTags = [{ id: '1', name: 'tag1', color: 'blue' }];
      mockInvoke.mockResolvedValue(mockTags);

      const { result } = renderHook(() => useTags('space-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockTags);
    });
  });

  describe('useAnalytics', () => {
    it('fetches analytics data', async () => {
      const mockAnalytics = { totalNotes: 10, totalTasks: 5 };
      mockInvoke.mockResolvedValue(mockAnalytics);

      const { result } = renderHook(() => useAnalytics(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockAnalytics);
    });
  });
});
