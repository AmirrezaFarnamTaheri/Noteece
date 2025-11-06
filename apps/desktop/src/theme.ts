// apps/desktop/src/theme.ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '600',
  },
  defaultRadius: 'md',
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  components: {
    Button: {
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    Paper: {
      styles: {
        root: {
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    Card: {
      styles: {
        root: {
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          borderRadius: 8,
        },
      },
    },
    Textarea: {
      styles: {
        input: {
          borderRadius: 8,
        },
      },
    },
  },
});
