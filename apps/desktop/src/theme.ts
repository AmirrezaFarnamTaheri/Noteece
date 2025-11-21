import {
  createTheme,
  rem,
  ActionIcon,
  Button,
  Card,
  Modal,
  NavLink,
  Paper,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';

/**
 * Noteece Revolutionary Theme
 * A modern, "Deep Obsidian" aesthetic inspired by the latest trends in
 * developer tools (Linear, Vercel, Raycast).
 *
 * Updated for "Revolutionary" visual appeal.
 */

export const theme = createTheme({
  primaryColor: 'violet',
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
      '#2C2E33', // 4 - Border Dark / Surface Hover (Slightly lighter than before for visibility)
      '#25262B', // 5 - Surface Lighter
      '#1A1B1E', // 6 - Surface Default (Cards)
      '#141517', // 7 - App Background
      '#101113', // 8 - Deep contrast / Modal overlay
      '#050506', // 9 - Almost black / Deepest Background
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
    fontFamily: 'Inter, sans-serif',
    fontWeight: '800',
    sizes: {
      h1: { fontSize: rem(34), lineHeight: '1.2' },
      h2: { fontSize: rem(28), lineHeight: '1.3' },
      h3: { fontSize: rem(22), lineHeight: '1.35' },
      h4: { fontSize: rem(18), lineHeight: '1.4' },
    },
  },

  components: {
    Button: Button.extend({
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
            boxShadow: '0 4px 12px rgba(132, 94, 247, 0.4)', // Stronger Violet glow
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      }),
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        radius: 'md',
        variant: 'subtle',
      },
      styles: (theme) => ({
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.colors.dark[6],
            transform: 'scale(1.1)',
            color: theme.colors.violet[4],
          },
        },
      }),
    }),
    Card: Card.extend({
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
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
          },
        },
      }),
    }),
    Paper: Paper.extend({
      defaultProps: {
        radius: 'lg',
      },
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colors.dark[6],
        },
      }),
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'lg',
        centered: true,
        overlayProps: {
          blur: 8,
          backgroundOpacity: 0.7,
        },
        transitionProps: {
          transition: 'pop',
          duration: 200,
        },
      },
      styles: (theme) => ({
        header: {
          backgroundColor: theme.colors.dark[7],
        },
        body: {
          backgroundColor: theme.colors.dark[7],
        },
        content: {
          border: `1px solid ${theme.colors.dark[4]}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        },
      }),
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: (theme) => ({
        input: {
          backgroundColor: theme.colors.dark[8],
          borderColor: theme.colors.dark[4],
          color: theme.colors.gray[1],
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:focus': {
            borderColor: theme.colors.violet[5],
            boxShadow: '0 0 0 2px rgba(132, 94, 247, 0.2)',
          },
          '&:hover': {
            borderColor: theme.colors.dark[3],
          },
        },
      }),
    }),
    Textarea: Textarea.extend({
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: (theme) => ({
        input: {
          backgroundColor: theme.colors.dark[8],
          borderColor: theme.colors.dark[4],
          color: theme.colors.gray[1],
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:focus': {
            borderColor: theme.colors.violet[5],
            boxShadow: '0 0 0 2px rgba(132, 94, 247, 0.2)',
          },
          '&:hover': {
            borderColor: theme.colors.dark[3],
          },
        },
      }),
    }),
    Badge: {
      defaultProps: {
        radius: 'sm',
        variant: 'light',
      },
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.5px',
        },
      },
    },
    Tooltip: Tooltip.extend({
      defaultProps: {
        radius: 'sm',
        withArrow: true,
      },
      styles: (theme) => ({
        tooltip: {
          backgroundColor: theme.colors.dark[9],
          border: `1px solid ${theme.colors.dark[4]}`,
          color: theme.colors.gray[0],
          fontSize: '0.75rem',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        },
      }),
    }),
    NavLink: NavLink.extend({
      defaultProps: {
        variant: 'light',
      },
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.md,
          marginBottom: '4px',
          transition: 'background-color 0.1s ease, color 0.1s ease',
          '&[data-active]': {
            backgroundColor: 'rgba(132, 94, 247, 0.15)', // Violet fade
            color: theme.colors.violet[3],
            fontWeight: 600,
            borderLeft: `3px solid ${theme.colors.violet[5]}`, // Accent line
          },
          '&:hover': {
            backgroundColor: theme.colors.dark[5],
          },
        },
        label: {
          fontSize: '0.9rem',
        },
      }),
    }),
  },
});
