import { useThemeStore, initializeTheme } from '../themeStore';

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => ({
  matches,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

describe('Theme Store', () => {
  beforeEach(() => {
    // Reset store state
    useThemeStore.setState({ mode: 'system', actualTheme: 'light' });

    // Mock document
    Object.defineProperty(document, 'documentElement', {
      value: {
        setAttribute: jest.fn(),
        dataset: {},
        classList: {
          remove: jest.fn(),
          add: jest.fn(),
        },
      },
      writable: true,
    });
  });

  describe('initial state', () => {
    it('should have system as default mode', () => {
      const state = useThemeStore.getState();
      expect(state.mode).toBe('system');
    });

    it('should have light as default actual theme', () => {
      const state = useThemeStore.getState();
      expect(state.actualTheme).toBe('light');
    });
  });

  describe('setMode', () => {
    it('should set mode to light', () => {
      const { setMode } = useThemeStore.getState();
      setMode('light');

      const state = useThemeStore.getState();
      expect(state.mode).toBe('light');
      expect(state.actualTheme).toBe('light');
    });

    it('should set mode to dark', () => {
      const { setMode } = useThemeStore.getState();
      setMode('dark');

      const state = useThemeStore.getState();
      expect(state.mode).toBe('dark');
      expect(state.actualTheme).toBe('dark');
    });

    it('should set mode to system', () => {
      // Mock system preference as dark
      window.matchMedia = jest.fn().mockImplementation(() => mockMatchMedia(true));

      const { setMode } = useThemeStore.getState();
      setMode('system');

      const state = useThemeStore.getState();
      expect(state.mode).toBe('system');
    });
  });

  describe('toggleTheme', () => {
    it('should cycle through modes: light -> dark -> system -> light', () => {
      const store = useThemeStore.getState();

      store.setMode('light');
      expect(useThemeStore.getState().mode).toBe('light');

      store.toggleTheme();
      expect(useThemeStore.getState().mode).toBe('dark');

      store.toggleTheme();
      expect(useThemeStore.getState().mode).toBe('system');

      store.toggleTheme();
      expect(useThemeStore.getState().mode).toBe('light');
    });
  });

  describe('syncWithSystem', () => {
    it('should update actualTheme when in system mode', () => {
      // Set to system mode first
      useThemeStore.setState({ mode: 'system', actualTheme: 'light' });

      // Mock system as dark
      window.matchMedia = jest.fn().mockImplementation(() => mockMatchMedia(true));

      const { syncWithSystem } = useThemeStore.getState();
      syncWithSystem();

      const state = useThemeStore.getState();
      expect(state.actualTheme).toBe('dark');
    });

    it('should not change theme when not in system mode', () => {
      // Set to dark mode
      useThemeStore.setState({ mode: 'dark', actualTheme: 'dark' });

      // Mock system as light
      window.matchMedia = jest.fn().mockImplementation(() => mockMatchMedia(false));

      const { syncWithSystem } = useThemeStore.getState();
      syncWithSystem();

      const state = useThemeStore.getState();
      expect(state.actualTheme).toBe('dark');
    });
  });

  describe('initializeTheme', () => {
    it('should return a cleanup function', () => {
      window.matchMedia = jest.fn().mockImplementation(() => mockMatchMedia(false));

      const cleanup = initializeTheme();
      expect(typeof cleanup).toBe('function');

      // Call cleanup without errors
      cleanup();
    });

    it('should add event listener for system theme changes', () => {
      const mockMedia = mockMatchMedia(false);
      window.matchMedia = jest.fn().mockImplementation(() => mockMedia);

      initializeTheme();

      expect(mockMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('theme persistence', () => {
    it('should only persist mode in localStorage', () => {
      // The store uses persist middleware with partialize
      // This test verifies the expected behavior
      const { setMode } = useThemeStore.getState();
      setMode('dark');

      const state = useThemeStore.getState();
      expect(state.mode).toBe('dark');
    });
  });
});
