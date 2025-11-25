import { renderHook, waitFor } from '@testing-library/react-native';
import { useTodayTimeline } from '../useTodayTimeline';
import * as Database from '../../lib/database';

jest.mock('../../lib/database', () => ({
  dbQuery: jest.fn(),
}));

describe('useTodayTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and combines data correctly', async () => {
    const mockInsights = [];
    const mockTasks = [{ id: 't1', title: 'Task 1', completed: false, due_at: Date.now() }];
    const mockEvents = [{ id: 'e1', title: 'Event 1', start_time: Date.now() }];

    (Database.dbQuery as jest.Mock)
      .mockResolvedValueOnce(mockInsights) // insights
      .mockResolvedValueOnce(mockTasks) // tasks
      .mockResolvedValueOnce(mockEvents); // events

    const { result } = renderHook(() => useTodayTimeline());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.timeline).toHaveLength(2);
    });

    expect(result.current.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Task 1' }),
        expect.objectContaining({ title: 'Event 1' }),
      ]),
    );
  });

  it('handles errors gracefully', async () => {
    // Mock console.error to suppress the expected error log
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (Database.dbQuery as jest.Mock).mockRejectedValue(new Error('DB Error'));
    const { result } = renderHook(() => useTodayTimeline());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.timeline).toHaveLength(0);
    });

    consoleSpy.mockRestore();
  });
});
