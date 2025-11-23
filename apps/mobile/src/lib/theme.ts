export const theme = {
  colors: {
    // Deep Obsidian Backgrounds
    background: "#050506",
    backgroundSecondary: "#101113",
    backgroundTertiary: "#1A1B1E",

    // Text Colors
    text: "#F3F0FF", // High contrast white/violet
    textSecondary: "#C1C2C5",
    textDimmed: "#909296",

    // Primary Brand Colors (Violet)
    primary: "#845EF7",
    primaryLight: "#B197FC",
    primaryDark: "#5F3DC4",
    primaryFade: "rgba(132, 94, 247, 0.15)",

    // Secondary Accent (Teal)
    accent: "#20C997",
    accentLight: "#63E6BE",
    accentDark: "#099268",

    // Semantic Colors
    border: "#2C2E33",
    borderLight: "#5C5F66",
    error: "#FA5252",
    success: "#20C997",
    warning: "#FCC419",

    // Overlays
    overlay: "rgba(0, 0, 0, 0.7)",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 9999,
  },

  typography: {
    h1: {
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.25,
    },
    h3: {
      fontSize: 20,
      fontWeight: "600",
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
    },
    caption: {
      fontSize: 12,
      color: "#909296",
    },
  },

  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.1)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
    primary: "0 4px 12px rgba(132, 94, 247, 0.3)",
  },
};

export type Theme = typeof theme;
