import { createTheme, rem } from '@mantine/core';

/**
 * Noteece Modern Theme
 * A revolutionary, high-contrast, elegant dark-first aesthetic.
 * Primary colors shift from standard blue to a deep, sophisticated Indigo/Violet.
 */

export const theme = createTheme({
  primaryColor: 'indigo',
  colors: {
    // Deep Slate / Obsidian background tones
    dark: [
      '#C1C2C5', // 0
      '#A6A7AB', // 1
      '#909296', // 2
      '#5C5F66', // 3
      '#373A40', // 4
      '#2C2E33', // 5
      '#25262B', // 6 - Paper/Card bg
      '#1A1B1E', // 7 - App bg
      '#141517', // 8
      '#101113', // 9
    ],
    // Vibrant accents
    indigo: [
      '#EDF2FF',
      '#DBE4FF',
      '#BAC8FF',
      '#91A7FF',
      '#748FFC',
      '#5C7CFA',
      '#4C6EF5', // Primary
      '#4263EB',
      '#3B5BDB',
      '#364FC7',
    ],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  headings: {
    fontFamily: 'Greycliff CF, Inter, sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(36) },
      h2: { fontSize: rem(30) },
      h3: { fontSize: rem(24) },
      h4: { fontSize: rem(20) },
    },
  },
  defaultRadius: 'lg',
  spacing: {
    xs: '0.75rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          transition: 'transform 0.1s ease, box-shadow 0.2s ease',
          '&:active': {
            transform: 'translateY(1px)',
          },
        },
      },
    },
    Card: {
      defaultProps: {
        padding: 'lg',
        radius: 'lg',
        withBorder: true,
      },
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colors.dark[6],
          backdropFilter: 'blur(10px)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows.md,
          },
        },
      }),
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colors.dark[6],
        },
      }),
    },
    Badge: {
      defaultProps: {
        size: 'md',
        radius: 'md',
        variant: 'light',
      },
    },
    TextInput: {
      styles: {
        input: {
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          '&:focus': {
             backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }
        },
      },
    },
  },
});
