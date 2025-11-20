import React from 'react';
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
  Box,
  ScrollArea,
  Paper,
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
} from '@tabler/icons-react';
import { useHotkeys } from '@mantine/hooks';
import CommandPalette from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { getOrCreateDailyNote } from '@/services/api';
import classes from './MainLayout.module.css';
import { useStore } from '../store';
import { logger } from '@/utils/logger';

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
  const [commandPaletteOpened, setCommandPaletteOpened] = React.useState(false);
  const navigate = useNavigate();
  useHotkeys([['mod+K', () => setCommandPaletteOpened((o) => !o)]]);
  const { activeSpaceId } = useStore();

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
      navbar={{ width: 260, breakpoint: 'sm' }}
      header={{ height: 60 }}
      styles={(theme) => ({
        main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
      })}
    >
      <AppShell.Header p="md" style={{ backdropFilter: 'blur(10px)' }}>
        <Group justify="space-between" align="center" h="100%">
          <Group gap="sm">
            <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} radius="md">
              <IconNote size={20} />
            </ThemeIcon>
            <div>
              <Title order={3} style={{ letterSpacing: '-0.5px', lineHeight: 1 }}>
                Noteece
              </Title>
              <Text size="10px" c="dimmed" fw={700} tt="uppercase" ls={1}>
                Workspace
              </Text>
            </div>
          </Group>
          <Group gap="sm">
            <Tooltip label="Open command palette (⌘K)">
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<IconCommand size={14} />}
                onClick={() => setCommandPaletteOpened(true)}
                radius="md"
              >
                Commands
              </Button>
            </Tooltip>
            <Button size="compact-sm" variant="light" onClick={handleDailyNote} radius="md">
              Daily Note
            </Button>
            <ThemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ borderRight: '1px solid var(--mantine-color-gray-2)' }}>
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="lg">
            {navLinkGroups.map((group) => (
              <Stack key={group.title} gap={4}>
                <Text size="11px" fw={700} c="dimmed" tt="uppercase" pl="xs" mb={4}>
                  {group.title}
                </Text>
                {group.links.map((link) => (
                  <NavLink to={link.to} key={link.label} style={{ textDecoration: 'none' }}>
                    {({ isActive }) => (
                      <MantineNavLink
                        label={link.label}
                        leftSection={<link.icon size={18} stroke={1.5} />}
                        active={isActive}
                        variant="light"
                        color="blue"
                        style={{ borderRadius: 'var(--mantine-radius-md)' }}
                        rightSection={isActive && <IconChevronRight size={14} stroke={1.5} />}
                      />
                    )}
                  </NavLink>
                ))}
              </Stack>
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section mt="md">
          <Divider my="sm" />
          <Paper withBorder p="xs" radius="md" bg="var(--mantine-color-gray-0)">
            <Group>
              <ThemeIcon variant="light" color="green" size="sm">
                <IconCloud size={14} />
              </ThemeIcon>
              <div>
                <Text size="xs" fw={700}>
                  Local Sync
                </Text>
                <Text size="xs" c="dimmed">
                  Active
                </Text>
              </div>
            </Group>
          </Paper>
          <Text size="xs" c="dimmed" ta="center" mt="xs">
            v1.0.0 • Production Ready
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <CommandPalette opened={commandPaletteOpened} onClose={() => setCommandPaletteOpened(false)} />
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default MainLayout;
