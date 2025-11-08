/**
 * Theme Context
 *
 * Provides theme customization with light/dark mode support.
 * Includes automatic theme switching based on system preferences.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "auto";
export type ActiveTheme = "light" | "dark";

export interface ThemeColors {
  // Base colors
  background: string;
  surface: string;
  surfaceVariant: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Primary colors
  primary: string;
  primaryContainer: string;
  onPrimary: string;

  // Accent colors
  accent: string;
  accentContainer: string;

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
  background: "#FFFFFF",
  surface: "#F5F5F5",
  surfaceVariant: "#E8E8E8",

  // Text colors
  text: "#1A1A1A",
  textSecondary: "#666666",
  textTertiary: "#999999",

  // Primary colors
  primary: "#007AFF",
  primaryContainer: "#E3F2FD",
  onPrimary: "#FFFFFF",

  // Accent colors
  accent: "#FF6B6B",
  accentContainer: "#FFEBEE",

  // Status colors
  error: "#FF3B30",
  warning: "#FF9500",
  success: "#34C759",
  info: "#5AC8FA",

  // Border and divider
  border: "#E0E0E0",
  divider: "#F0F0F0",

  // Special
  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.1)",
};

const darkColors: ThemeColors = {
  // Base colors
  background: "#121212",
  surface: "#1E1E1E",
  surfaceVariant: "#2A2A2A",

  // Text colors
  text: "#FFFFFF",
  textSecondary: "#AAAAAA",
  textTertiary: "#888888",

  // Primary colors
  primary: "#0A84FF",
  primaryContainer: "#1C3A5E",
  onPrimary: "#FFFFFF",

  // Accent colors
  accent: "#FF6B6B",
  accentContainer: "#4A2828",

  // Status colors
  error: "#FF453A",
  warning: "#FF9F0A",
  success: "#32D74B",
  info: "#64D2FF",

  // Border and divider
  border: "#3A3A3A",
  divider: "#2A2A2A",

  // Special
  overlay: "rgba(0, 0, 0, 0.7)",
  shadow: "rgba(0, 0, 0, 0.3)",
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "noteece_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");
  const [isLoading, setIsLoading] = useState(true);

  // Determine active theme based on mode and system preference
  const activeTheme: ActiveTheme =
    themeMode === "auto"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  const theme: Theme = {
    mode: activeTheme,
    colors: activeTheme === "dark" ? darkColors : lightColors,
    isDark: activeTheme === "dark",
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
  }, [themeMode, isLoading]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === "light" || saved === "dark" || saved === "auto")) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error("[Theme] Failed to load theme preference:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async () => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (error) {
      console.error("[Theme] Failed to save theme preference:", error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((current) => {
      if (current === "auto") return "light";
      if (current === "light") return "dark";
      return "light";
    });
  };

  if (isLoading) {
    // Return a default theme while loading
    return <ThemeContext.Provider value={{
      theme: {
        mode: "dark",
        colors: darkColors,
        isDark: true,
      },
      themeMode: "auto",
      setThemeMode: () => {},
      toggleTheme: () => {},
    }}>{children}</ThemeContext.Provider>;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
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
