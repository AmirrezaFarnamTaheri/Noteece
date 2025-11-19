import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsync } from '../useAsync';

describe('useAsync', () => {
  it('should handle success state', async () => {
    const mockFn = jest.fn().mockResolvedValue('success data');
    const { result } = renderHook(() => useAsync(mockFn));

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('success data');
  });

  it('should handle error state', async () => {
    const mockError = new Error('failed');
    const mockFn = jest.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useAsync(mockFn));

    act(() => {
      result.current.execute();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(mockError);
  });
});
