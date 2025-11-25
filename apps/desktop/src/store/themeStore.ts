/**
 * Theme Store with OS Preference Sync
 *
 * Provides dark mode synchronization with system preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActualTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  actualTheme: ActualTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  syncWithSystem: () => void;
}

/**
 * Get the system's preferred color scheme
 */
const getSystemTheme = (): ActualTheme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

/**
 * Calculate actual theme based on mode
 */
const calculateActualTheme = (mode: ThemeMode): ActualTheme => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      actualTheme: calculateActualTheme('system'),

      setMode: (mode: ThemeMode) => {
        const actualTheme = calculateActualTheme(mode);
        set({ mode, actualTheme });
        applyTheme(actualTheme);
      },

      toggleTheme: () => {
        const { mode } = get();
        const newMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
        get().setMode(newMode);
      },

      syncWithSystem: () => {
        const { mode } = get();
        if (mode === 'system') {
          const actualTheme = getSystemTheme();
          set({ actualTheme });
          applyTheme(actualTheme);
        }
      },
    }),
    {
      name: 'noteece-theme',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const actualTheme = calculateActualTheme(state.mode);
          state.actualTheme = actualTheme;
          applyTheme(actualTheme);
        }
      },
    },
  ),
);

/**
 * Apply theme to document
 */
function applyTheme(theme: ActualTheme): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    // Use dataset primarily, setAttribute as fallback for test environments
    if (document.documentElement.dataset) {
      document.documentElement.dataset.mantineColorScheme = theme;
    } else {
      // eslint-disable-next-line unicorn/prefer-dom-node-dataset -- fallback for test environments
      document.documentElement.setAttribute('data-mantine-color-scheme', theme);
    }
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }
}

/**
 * Initialize theme and listen for system changes
 */
export function initializeTheme(): () => void {
  const store = useThemeStore.getState();

  // Apply initial theme
  applyTheme(store.actualTheme);

  // Listen for system theme changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      store.syncWithSystem();
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
    }

    // Return cleanup function
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }

  return () => {};
}
