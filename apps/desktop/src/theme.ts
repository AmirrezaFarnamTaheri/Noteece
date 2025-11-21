import { createTheme, rem } from '@mantine/core';

/**
 * Noteece Revolutionary Theme
 * A modern, "Deep Obsidian" aesthetic inspired by the latest trends in
 * developer tools (Linear, Vercel, Raycast).
 */

export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',

  colors: {
    // Custom "Obsidian" scale for a richer, less generic gray
    dark: [
      '#C1C2C5', // 0
      '#A6A7AB', // 1
      '#909296', // 2
      '#5C5F66', // 3
      '#373A40', // 4
      '#2C2E33', // 5
      '#25262B', // 6 - Cards/Paper
      '#1A1B1E', // 7 - App Background
      '#141517', // 8 - Deep contrast
      '#101113', // 9 - Almost black
    ],
    // Vibrant, electric indigo for primary actions
    indigo: [
      '#E0E7FF',
      '#C7D2FE',
      '#A5B4FC',
      '#818CF8',
      '#6366F1',
      '#4F46E5', // Primary
      '#4338CA',
      '#3730A3',
      '#312E81',
      '#1E1B4B',
    ],
  },

  fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, ui-monospace, monospace',

  headings: {
    fontFamily: 'Cal Sans, Inter, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: '1.2' },
      h2: { fontSize: rem(26), lineHeight: '1.3' },
      h3: { fontSize: rem(22), lineHeight: '1.35' },
      h4: { fontSize: rem(18), lineHeight: '1.4' },
    },
  },

  components: {
    Button: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        withBorder: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      styles: (theme: any) => ({
        root: {
          backgroundColor: theme.colors.dark[6],
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: theme.colors.indigo[5],
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          },
        },
      }),
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        overlayProps: {
          blur: 8,
          opacity: 0.55,
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      styles: (theme: any) => ({
        input: {
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderColor: 'transparent',
          '&:focus': {
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: theme.colors.indigo[5],
          },
        },
      }),
    },
  },
});
