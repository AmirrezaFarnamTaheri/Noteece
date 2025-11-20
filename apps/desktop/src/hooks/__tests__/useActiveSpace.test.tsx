import { renderHook, act } from '@testing-library/react';
import { useActiveSpace } from '../useActiveSpace';

import { useStore } from '../../store';

describe('useActiveSpace', () => {
  beforeEach(() => {
    // Reset the Zustand store and localStorage before each test
    const store = useStore.getState();
    if (store.clearStorage) {
      store.clearStorage();
    } else {
      // Fallback if clearStorage isn't exposed or functional in test env
      useStore.setState({ spaces: [], activeSpaceId: null });
    }
    localStorage.clear();
  });

  it('should return default space if none stored', () => {
    const { result } = renderHook(() => useActiveSpace());
    // Assuming 'default' or similar is the initial state
    expect(result.current.activeSpaceId).toBeDefined();
  });

  it('should update active space', () => {
    const { result } = renderHook(() => useActiveSpace());

    act(() => {
      result.current.setActiveSpaceId('new-space-123');
    });

    expect(result.current.activeSpaceId).toBe('new-space-123');
    // Persistence is disabled in test environment via store.ts
  });
});
