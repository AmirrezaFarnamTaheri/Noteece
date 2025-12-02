/**
 * Noteece Mobile Theme
 * Deep Obsidian design system implementation
 */

export const colors = {
  // Deep Obsidian Backgrounds
  background: '#050506',
  backgroundSecondary: '#101113',
  backgroundTertiary: '#1A1B1E',
  backgroundElevated: '#25262B',

  // Text Colors
  text: '#F3F0FF', // High contrast white/violet
  textSecondary: '#C1C2C5',
  textDimmed: '#909296',
  textPrimary: '#F3F0FF', // Alias for text
  textTertiary: '#909296', // Alias for textDimmed

  // Primary Brand Colors (Violet)
  primary: '#845EF7',
  primaryLight: '#B197FC',
  primaryDark: '#5F3DC4',
  primaryFade: 'rgba(132, 94, 247, 0.15)',
  // Complete Violet Palette for Consistency
  violet: [
    '#f3f0ff',
    '#e5dbff',
    '#d0bfff',
    '#b197fc',
    '#9775fa',
    '#845ef7',
    '#7950f2',
    '#7048e8',
    '#6741d9',
    '#5f3dc4',
  ],

  // Secondary Accent (Teal)
  accent: '#20C997',
  accentLight: '#63E6BE',
  accentDark: '#099268',

  // Semantic Colors
  border: '#2C2E33',
  borderLight: '#5C5F66',
  error: '#FA5252',
  success: '#20C997',
  warning: '#FCC419',

  // Surfaces
  surface: '#101113',
  surfaceElevated: '#25262B',

  // Entity Colors
  task: '#20C997', // Teal
  note: '#845EF7', // Violet

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  xxl: 40,
  xxxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    mono: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  h1: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    color: '#909296',
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  primary: {
    shadowColor: '#845EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

// For type inference
export type Theme = typeof theme;
