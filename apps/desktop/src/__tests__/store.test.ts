import { useStore } from '../store';

describe('Store', () => {
  beforeEach(() => {
    useStore.getState().clearStorage();
  });

  it('should set spaces', () => {
    const spaces = [{ id: '1', name: 'Space 1', enabled_modes_json: '[]' }];
    useStore.getState().setSpaces(spaces);
    expect(useStore.getState().spaces).toEqual(spaces);
  });

  it('should set active space id', () => {
    useStore.getState().setActiveSpaceId('1');
    expect(useStore.getState().activeSpaceId).toBe('1');
  });

  it('should clear storage', () => {
    useStore.getState().setSpaces([{ id: '1', name: 'Space 1', enabled_modes_json: '[]' }]);
    useStore.getState().setActiveSpaceId('1');
    useStore.getState().clearStorage();
    expect(useStore.getState().spaces).toEqual([]);
    expect(useStore.getState().activeSpaceId).toBeNull();
  });
});
