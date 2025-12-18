import { createTheme, MantineThemeOverride } from '@mantine/core';

export const theme: MantineThemeOverride = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: '600',
  },
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#050506', // Dark 9 (Deep Obsidian)
    ],
    obsidian: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#050506',
    ],
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
  },
  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      styles: (_theme: any) => ({
        root: {
          transition: 'transform 0.1s ease, box-shadow 0.2s ease',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      }),
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      styles: (_theme: any) => ({
        root: {
          backgroundColor: 'rgba(20, 21, 23, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      }),
    },
    Card: {
      defaultProps: {
        radius: 'md',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      styles: (theme: any) => ({
        root: {
          backgroundColor: 'rgba(32, 33, 36, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows.xl,
            backgroundColor: 'rgba(37, 38, 43, 0.85)',
            borderColor: 'rgba(132, 94, 247, 0.3)', // Violet hint on hover
          },
        },
      }),
    },
    Modal: {
      styles: {
        header: {
          backgroundColor: 'transparent',
        },
        content: {
          backgroundColor: '#141517',
          border: '1px solid #2C2E33',
        },
      },
    },
  },
});
