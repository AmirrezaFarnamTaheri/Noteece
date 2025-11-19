import { renderHook, waitFor } from '@testing-library/react-native';
import { useTodayTimeline } from '../useTodayTimeline';
import * as Database from '../../lib/database';

jest.mock('../../lib/database', () => ({
  dbQuery: jest.fn().mockResolvedValue([]),
}));

describe('useTodayTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and combines data correctly', async () => {
    const mockTasks = [{ id: 't1', title: 'Task 1', completed: false }];
    const mockNotes = [{ id: 'n1', title: 'Note 1' }];

    (Database.dbQuery as jest.Mock)
      .mockResolvedValueOnce(mockTasks) // tasks
      .mockResolvedValueOnce(mockNotes); // events (mocking notes as events for simplicity)

    const { result } = renderHook(() => useTodayTimeline());

    // Initial state
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.timeline).toHaveLength(2);
    expect(result.current.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Task 1' }),
        expect.objectContaining({ title: 'Note 1' }),
      ])
    );
  });

  it('handles errors gracefully', async () => {
    (Database.dbQuery as jest.Mock).mockRejectedValue(new Error('DB Error'));

    const { result } = renderHook(() => useTodayTimeline());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should return empty or partial results depending on implementation
    // but shouldn't crash
    expect(result.current.timeline).toBeDefined();
    expect(result.current.timeline).toHaveLength(0);
  });
});
