// Modern, beautiful color palette inspired by Notion and Linear
// Updated to match Desktop's revolutionary aesthetic (Deep Indigo/Teal)

export const colors = {
  // Primary brand colors
  primary: "#4C6EF5", // Indigo-500 (Matches Desktop)
  primaryLight: "#748FFC",
  primaryDark: "#364FC7",

  // Background colors (dark mode optimized - Obsidian/Slate)
  background: "#101113", // Dark 9
  backgroundElevated: "#141517", // Dark 8
  backgroundHover: "#25262B", // Dark 6

  // Surface colors
  surface: "#1A1B1E", // Dark 7
  surfaceElevated: "#2C2E33", // Dark 5
  surfaceInput: "rgba(255, 255, 255, 0.05)",

  // Text colors
  text: "#C1C2C5", // Dark 0
  textPrimary: "#C1C2C5",
  textSecondary: "#909296", // Dark 2
  textTertiary: "#5C5F66", // Dark 3
  textInverse: "#101113",

  // Semantic colors
  success: "#20C997", // Teal-500
  warning: "#FCC419", // Yellow-500
  error: "#FA5252", // Red-500
  info: "#4C6EF5", // Indigo-500

  // Accent colors for different content types (Vibrant)
  task: "#748FFC", // Indigo
  note: "#228BE6", // Blue
  calendar: "#FA5252", // Red/Pink
  health: "#20C997", // Teal
  finance: "#FAB005", // Yellow
  social: "#BE4BDB", // Grape

  // Borders and dividers
  border: "#2C2E33", // Dark 5
  borderLight: "#373A40", // Dark 4

  // Overlay and shadow
  overlay: "rgba(0, 0, 0, 0.7)",
  shadow: "rgba(0, 0, 0, 0.5)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontFamily: {
    regular: "Inter-Regular",
    medium: "Inter-Medium",
    semibold: "Inter-SemiBold",
    bold: "Inter-Bold",
    mono: "JetBrainsMono-Regular",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    xxl: 24,
    "3xl": 30,
    xxxl: 30,
  } as Record<string, number>,
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
};
