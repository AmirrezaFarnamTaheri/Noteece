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
      '#25262B', // Dark 6
      '#1A1B1E', // Dark 7 (Base bg)
      '#141517', // Dark 8
      '#101113', // Dark 9
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
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      styles: (_theme: any) => ({
        root: {
          backgroundColor: 'rgba(26, 27, 30, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
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
          backgroundColor: 'rgba(37, 38, 43, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows.md,
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
        }
      }
    }
  },
});
