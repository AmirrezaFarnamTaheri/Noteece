// Modern, beautiful color palette inspired by Notion and Linear
export const colors = {
  // Primary brand colors
  primary: "#6366F1",
  primaryLight: "#818CF8",
  primaryDark: "#4F46E5",

  // Background colors (dark mode optimized)
  background: "#0A0E27",
  backgroundElevated: "#14182E",
  backgroundHover: "#1C2137",

  // Surface colors
  surface: "#1E2235",
  surfaceElevated: "#252A40",

  // Text colors
  text: "#E4E7EC",
  textPrimary: "#E4E7EC", // Alias for 'text' for consistency
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",

  // Semantic colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Accent colors for different content types
  task: "#8B5CF6",
  note: "#06B6D4",
  calendar: "#EC4899",
  health: "#10B981",
  finance: "#F59E0B",

  // Borders and dividers
  border: "#2D3348",
  borderLight: "#3B4158",

  // Overlay and shadow
  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.3)",
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
    mono: "Courier New", // Monospace font for code/error displays
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24, // Alias for xxl (TailwindCSS-style naming)
    xxl: 24,
    "3xl": 32, // Alias for xxxl (TailwindCSS-style naming)
    xxxl: 32,
  } as Record<string, number>,
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
};
