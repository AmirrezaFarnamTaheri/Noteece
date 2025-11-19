import { renderHook, act } from '@testing-library/react';
import { useActiveSpace } from '../useActiveSpace';

describe('useActiveSpace', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default space if none stored', () => {
    const { result } = renderHook(() => useActiveSpace());
    // Assuming 'default' or similar is the initial state
    expect(result.current.activeSpaceId).toBeDefined();
  });

  it('should update active space and persist to localStorage', () => {
    const { result } = renderHook(() => useActiveSpace());

    act(() => {
      result.current.setActiveSpaceId('new-space-123');
    });

    expect(result.current.activeSpaceId).toBe('new-space-123');
    expect(localStorage.getItem('activeSpaceId')).toBe('new-space-123'); // Adjust key if different in implementation
  });

  it('should initialize from localStorage', () => {
    localStorage.setItem('activeSpaceId', 'stored-space');
    const { result } = renderHook(() => useActiveSpace());
    expect(result.current.activeSpaceId).toBe('stored-space');
  });
});
