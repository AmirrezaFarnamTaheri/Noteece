import { createTheme, rem } from '@mantine/core';

/**
 * Noteece Revolutionary Theme
 * A modern, "Deep Obsidian" aesthetic inspired by the latest trends in
 * developer tools (Linear, Vercel, Raycast).
 *
 * Updated for "Revolutionary" visual appeal.
 */

export const theme = createTheme({
  primaryColor: 'violet', // Changed to Violet for a more cyber/modern feel
  defaultRadius: 'md',
  cursorType: 'pointer',

  colors: {
    // Custom "Deep Obsidian" scale
    // Darker, cooler, with a hint of blue/purple in the darkest shades
    dark: [
      '#C1C2C5', // 0 - Text Light
      '#A6A7AB', // 1 - Text Dimmed
      '#909296', // 2 - Icon inactive
      '#5C5F66', // 3 - Border Light
      '#373A40', // 4 - Border Dark / Surface Hover
      '#25262B', // 5 - Surface Lighter
      '#1F2023', // 6 - Surface Default (Cards)
      '#141517', // 7 - App Background
      '#101113', // 8 - Deep contrast / Modal overlay
      '#0A0A0C', // 9 - Almost black / Deepest Background
    ],
    // Electric Violet for primary actions - "Cyber" feel
    violet: [
      '#F3F0FF',
      '#E5DBFF',
      '#D0BFFF',
      '#B197FC',
      '#9775FA',
      '#845EF7', // Primary
      '#7950F2',
      '#7048E8',
      '#6741D9',
      '#5F3DC4',
    ],
    // Secondary Accent: Teal (Success/Growth)
    teal: [
      '#E6FCF5',
      '#C3FAE8',
      '#96F2D7',
      '#63E6BE',
      '#38D9A9',
      '#20C997',
      '#12B886',
      '#0CA678',
      '#099268',
      '#087F5B',
    ],
  },

  fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, ui-monospace, monospace',

  headings: {
    fontFamily: 'Cal Sans, Inter, sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(34), lineHeight: '1.2', fontWeight: '800' },
      h2: { fontSize: rem(28), lineHeight: '1.3', fontWeight: '700' },
      h3: { fontSize: rem(22), lineHeight: '1.35', fontWeight: '600' },
      h4: { fontSize: rem(18), lineHeight: '1.4', fontWeight: '600' },
    },
  },

  components: {
    Button: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme) => ({
        root: {
          fontWeight: 600,
          transition: 'transform 0.1s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(132, 94, 247, 0.25)', // Violet glow
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      }),
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
      styles: (theme) => ({
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.colors.dark[4],
            transform: 'scale(1.05)',
          },
        },
      }),
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        withBorder: true,
        padding: 'lg',
      },
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colors.dark[6],
          borderColor: theme.colors.dark[4],
          transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: theme.colors.violet[5],
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
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
    Modal: {
      defaultProps: {
        radius: 'lg',
        centered: true,
        overlayProps: {
          blur: 8,
          color: '#000',
          opacity: 0.6,
        },
        transitionProps: {
          transition: 'pop',
          duration: 200,
        },
      },
      styles: (theme) => ({
        header: {
          backgroundColor: theme.colors.dark[6],
        },
        body: {
          backgroundColor: theme.colors.dark[6],
        },
        content: {
          border: `1px solid ${theme.colors.dark[4]}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        },
      }),
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: (theme) => ({
        input: {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderColor: theme.colors.dark[4],
          transition: 'border-color 0.2s ease, background-color 0.2s ease',
          '&:focus': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: theme.colors.violet[5],
            boxShadow: '0 0 0 1px var(--mantine-color-violet-5)',
          },
          '&:hover': {
            borderColor: theme.colors.dark[3],
          },
        },
      }),
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: (theme) => ({
        input: {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderColor: theme.colors.dark[4],
          transition: 'border-color 0.2s ease, background-color 0.2s ease',
          '&:focus': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: theme.colors.violet[5],
            boxShadow: '0 0 0 1px var(--mantine-color-violet-5)',
          },
          '&:hover': {
            borderColor: theme.colors.dark[3],
          },
        },
      }),
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
        variant: 'light',
      },
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    Tooltip: {
      defaultProps: {
        radius: 'sm',
        withArrow: true,
      },
      styles: (theme) => ({
        tooltip: {
          backgroundColor: theme.colors.dark[8],
          border: `1px solid ${theme.colors.dark[4]}`,
          color: theme.colors.gray[0],
          fontSize: '0.75rem',
        },
      }),
    },
    NavLink: {
      defaultProps: {
        variant: 'light',
      },
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.md,
          '&[data-active]': {
            backgroundColor: 'rgba(132, 94, 247, 0.15)', // Violet fade
            color: theme.colors.violet[3],
            fontWeight: 600,
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      }),
    },
  },
});
