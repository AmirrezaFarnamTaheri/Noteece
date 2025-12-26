/**
 * Theme Context
 *
 * Provides theme customization with light/dark mode support.
 * Includes automatic theme switching based on system preferences.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as obsidianColors } from '@/lib/theme';
import { Logger } from '@/lib/logger';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ActiveTheme = 'light' | 'dark';

export interface ThemeColors {
  // Base colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  backgroundElevated: string;
  surface: string;
  surfaceVariant: string;
  surfaceElevated: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDimmed: string;
  textPrimary: string;

  // Primary colors
  primary: string;
  primaryContainer: string;
  onPrimary: string;

  // Accent colors
  accent: string;
  accentContainer: string;

  // Entity colors
  task: string;
  note: string;

  // Status colors
  error: string;
  warning: string;
  success: string;
  info: string;

  // Border and divider
  border: string;
  divider: string;

  // Special
  overlay: string;
  shadow: string;
}

export interface Theme {
  mode: ActiveTheme;
  colors: ThemeColors;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  // Base colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F1F3F5',
  backgroundElevated: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceVariant: '#E8E8E8',
  surfaceElevated: '#FFFFFF',

  // Text colors
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDimmed: '#CCCCCC',
  textPrimary: '#1A1A1A',

  // Primary colors
  primary: '#007AFF',
  primaryContainer: '#E3F2FD',
  onPrimary: '#FFFFFF',

  // Accent colors
  accent: '#FF6B6B',
  accentContainer: '#FFEBEE',

  // Entity colors
  task: '#20C997',
  note: '#845EF7',

  // Status colors
  error: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
  info: '#5AC8FA',

  // Border and divider
  border: '#E0E0E0',
  divider: '#F0F0F0',

  // Special
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const darkColors: ThemeColors = {
  // Base colors
  background: obsidianColors.background,
  backgroundSecondary: obsidianColors.backgroundSecondary,
  backgroundTertiary: obsidianColors.backgroundTertiary,
  backgroundElevated: obsidianColors.backgroundElevated,
  surface: obsidianColors.surface,
  surfaceVariant: obsidianColors.surfaceVariant,
  surfaceElevated: obsidianColors.surfaceElevated,

  // Text colors
  text: obsidianColors.text,
  textSecondary: obsidianColors.textSecondary,
  textTertiary: obsidianColors.textTertiary,
  textDimmed: obsidianColors.textDimmed,
  textPrimary: obsidianColors.textPrimary,

  // Primary colors
  primary: obsidianColors.primary,
  primaryContainer: obsidianColors.primaryContainer,
  onPrimary: obsidianColors.onPrimary,

  // Accent colors
  accent: obsidianColors.accent,
  accentContainer: obsidianColors.accentContainer,

  // Entity colors
  task: obsidianColors.task,
  note: obsidianColors.note,

  // Status colors
  error: obsidianColors.error,
  warning: obsidianColors.warning,
  success: obsidianColors.success,
  info: obsidianColors.info,

  // Border and divider
  border: obsidianColors.border,
  divider: obsidianColors.divider,

  // Special
  overlay: obsidianColors.overlay,
  shadow: obsidianColors.shadow,
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'noteece_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isLoading, setIsLoading] = useState(true);

  // Determine active theme based on mode and system preference
  const activeTheme: ActiveTheme = themeMode === 'auto' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : themeMode;

  const theme: Theme = {
    mode: activeTheme,
    colors: activeTheme === 'dark' ? darkColors : lightColors,
    isDark: activeTheme === 'dark',
  };

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Save theme preference when it changes
  useEffect(() => {
    if (!isLoading) {
      saveThemePreference();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeMode, isLoading]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'auto')) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      Logger.error('Failed to load theme preference', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async () => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (error) {
      Logger.error('Failed to save theme preference', error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((current) => {
      if (current === 'auto') return 'light';
      if (current === 'light') return 'dark';
      return 'light';
    });
  };

  if (isLoading) {
    // Return a default theme while loading
    return (
      <ThemeContext.Provider
        value={{
          theme: {
            mode: 'dark',
            colors: darkColors,
            isDark: true,
          },
          themeMode: 'auto',
          setThemeMode: () => {},
          toggleTheme: () => {},
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook for quick access to theme colors
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

// Hook to check if dark mode is active
export function useIsDark() {
  const { theme } = useTheme();
  return theme.isDark;
}
