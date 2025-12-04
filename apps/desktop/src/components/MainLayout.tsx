import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppShell,
  Title,
  Group,
  Button,
  Stack,
  Divider,
  Text,
  Tooltip,
  NavLink as MantineNavLink,
  ThemeIcon,
  ScrollArea,
  Paper,
  ActionIcon,
  Affix,
  Box,
  Image,
} from '@mantine/core';
import {
  IconHome2,
  IconNote,
  IconCheckbox,
  IconClipboardList,
  IconSearch,
  IconReport,
  IconBook,
  IconSettings,
  IconUsers,
  IconDatabaseImport,
  IconCloud,
  IconFileText,
  IconChartBar,
  IconCommand,
  IconScan,
  IconChevronRight,
  IconEyeOff,
  IconEye,
  IconPlus,
} from '@tabler/icons-react';
import { useHotkeys } from '@mantine/hooks';
import CommandPalette from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { getOrCreateDailyNote } from '@/services/api';
import { useStore } from '../store';
import { logger } from '@/utils/logger';
import { UndoToast } from './ui/UndoToast';

const navLinkGroups = [
  {
    title: 'Main',
    links: [
      { icon: IconHome2, label: 'Home', to: '/main' },
      { icon: IconNote, label: 'Editor', to: '/main/editor' },
      { icon: IconSearch, label: 'Search', to: '/main/search' },
    ],
  },
  {
    title: 'Work',
    links: [
      { icon: IconCheckbox, label: 'Tasks', to: '/main/tasks' },
      { icon: IconClipboardList, label: 'Projects', to: '/main/projects' },
      { icon: IconReport, label: 'Weekly Review', to: '/main/review' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { icon: IconBook, label: 'SRS', to: '/main/srs' },
      { icon: IconFileText, label: 'Templates', to: '/main/templates' },
    ],
  },
  {
    title: 'System',
    links: [
      { icon: IconChartBar, label: 'Analytics', to: '/main/analytics' },
      { icon: IconUsers, label: 'Users', to: '/main/users' },
      { icon: IconDatabaseImport, label: 'Import', to: '/main/import' },
      { icon: IconCloud, label: 'Sync', to: '/main/sync' },
      { icon: IconScan, label: 'OCR', to: '/main/ocr' },
      { icon: IconSettings, label: 'Settings', to: '/main/settings' },
    ],
  },
];

const MainLayout: React.FC = () => {
  const [commandPaletteOpened, setCommandPaletteOpened] = useState(false);
  const navigate = useNavigate();
  useHotkeys([['mod+K', () => setCommandPaletteOpened((o) => !o)]]);
  const { activeSpaceId, zenMode, toggleZenMode } = useStore();

  const handleDailyNote = async () => {
    if (activeSpaceId) {
      try {
        const dailyNote = await getOrCreateDailyNote(activeSpaceId);
        navigate(`/main/editor?noteId=${dailyNote.id.toString()}`);
      } catch (error) {
        logger.error('Error getting or creating daily note:', error as Error);
      }
    }
  };

  return (
    <AppShell
      padding="md"
      navbar={zenMode ? undefined : { width: 250, breakpoint: 'sm' }}
      header={zenMode ? undefined : { height: 64 }} // Slightly taller for better logo breathing room
      styles={(theme) => ({
        main: {
          backgroundColor: theme.colors.dark[9], // Deepest background
          paddingTop: zenMode ? 0 : 'calc(64px + var(--mantine-spacing-md))', // Adjust for header
        },
      })}
    >
      {!zenMode && (
        <AppShell.Header
          p="md"
          style={{
            background: 'rgba(20, 21, 23, 0.8)', // Semi-transparent
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <Group justify="space-between" align="center" h="100%">
            <Group gap="sm" style={{ cursor: 'pointer' }} onClick={() => navigate('/main')}>
              <Image
                src="/logo.svg"
                w={32}
                h={32}
                alt="Noteece Logo"
                style={{ filter: 'drop-shadow(0 0 8px rgba(132, 94, 247, 0.5))' }}
              />
              <Box>
                <Title
                  order={4}
                  style={{
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    color: 'var(--mantine-color-gray-0)',
                  }}
                >
                  Noteece
                </Title>
                <Text size="8px" c="dimmed" fw={700} tt="uppercase" mt={2} style={{ letterSpacing: '2px' }}>
                  Private Vault
                </Text>
              </Box>
            </Group>

            <Group gap="xs">
              <Tooltip label="Open command palette (⌘K)">
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<IconCommand size={12} />}
                  onClick={() => setCommandPaletteOpened(true)}
                  radius="md"
                  fw={500}
                  c="dimmed"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Search...
                </Button>
              </Tooltip>

              <Button
                size="xs"
                variant="gradient"
                gradient={{ from: 'violet', to: 'indigo' }}
                onClick={handleDailyNote}
                radius="md"
                leftSection={<IconPlus size={14} />}
                style={{
                  boxShadow: '0 4px 12px rgba(132, 94, 247, 0.3)',
                  transition: 'transform 0.2s ease',
                }}
              >
                Daily Note
              </Button>

              <Divider orientation="vertical" mx={4} color="dark.6" />

              <Tooltip label="Toggle Zen Mode">
                <ActionIcon variant="subtle" onClick={toggleZenMode} size="lg" radius="md" color="gray">
                  <IconEyeOff size={20} />
                </ActionIcon>
              </Tooltip>

              <ThemeToggle />
            </Group>
          </Group>
        </AppShell.Header>
      )}

      {!zenMode && (
        <AppShell.Navbar
          p="sm"
          style={{
            backgroundColor: 'var(--mantine-color-dark-8)', // Slightly lighter than main
            borderRight: 'none', // Removed border for cleaner look
          }}
        >
          <AppShell.Section grow component={ScrollArea} className="no-scrollbar">
            <Stack gap="lg" pt="sm">
              {navLinkGroups.map((group) => (
                <Stack key={group.title} gap={4}>
                  <Text
                    size="10px"
                    fw={800}
                    c="dimmed"
                    tt="uppercase"
                    pl="xs"
                    mb={4}
                    style={{ opacity: 0.7, letterSpacing: '1px' }}
                  >
                    {group.title}
                  </Text>
                  {group.links.map((link) => (
                    <NavLink to={link.to} key={link.label} style={{ textDecoration: 'none' }}>
                      {({ isActive }) => (
                        <MantineNavLink
                          label={
                            <Text size="sm" fw={isActive ? 600 : 500}>
                              {link.label}
                            </Text>
                          }
                          leftSection={
                            <link.icon
                              size={18}
                              stroke={1.5}
                              color={isActive ? 'var(--mantine-color-violet-3)' : 'var(--mantine-color-gray-5)'}
                            />
                          }
                          active={isActive}
                          variant="subtle"
                          rightSection={
                            isActive && <IconChevronRight size={14} stroke={1.5} style={{ opacity: 0.5 }} />
                          }
                          styles={{
                            root: {
                              borderRadius: '8px',
                              '&[data-active]': {
                                backgroundColor: 'rgba(132, 94, 247, 0.1)',
                              },
                            },
                          }}
                        />
                      )}
                    </NavLink>
                  ))}
                </Stack>
              ))}
            </Stack>
          </AppShell.Section>

          <AppShell.Section mt="md">
            <Paper
              p="xs"
              radius="md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <Group gap="xs">
                <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
                  <IconCloud size={12} />
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text size="xs" fw={700} c="teal.1">
                    Sync Active
                  </Text>
                  <Text size="10px" c="dimmed">
                    Local P2P Ready
                  </Text>
                </Box>
              </Group>
            </Paper>
          </AppShell.Section>
        </AppShell.Navbar>
      )}

      <AppShell.Main>
        <CommandPalette opened={commandPaletteOpened} onClose={() => setCommandPaletteOpened(false)} />
        <UndoToast />
        <Outlet />
        {zenMode && (
          <Affix position={{ bottom: 24, right: 24 }}>
            <Tooltip label="Exit Zen Mode" position="left">
              <ActionIcon
                variant="filled"
                color="dark"
                size="xl"
                radius="xl"
                onClick={toggleZenMode}
                style={{
                  opacity: 0.3,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.3';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <IconEye size={24} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Affix>
        )}
      </AppShell.Main>
    </AppShell>
  );
};

export default MainLayout;
