import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AppShell, Title, Group, Button, Stack, Divider, Text, Tooltip } from '@mantine/core';
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
} from '@tabler/icons-react';
import { useHotkeys } from '@mantine/hooks';
import CommandPalette from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { getOrCreateDailyNote } from '@/services/api';
import classes from './MainLayout.module.css';
import { useStore } from '../store';
import { logger } from '../utils/logger';

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
    <AppShell padding="md" navbar={{ width: 250, breakpoint: 'sm' }} header={{ height: 60 }}>
      <AppShell.Header p="md">
        <Group justify="space-between" align="center" h="100%">
          <Group gap="xs">
            <Title order={3} style={{ letterSpacing: '-0.5px' }}>
              Noteece
            </Title>
            <Text size="xs" c="dimmed" fw={500}>
              Knowledge Management
            </Text>
          </Group>
          <Group gap="sm">
            <Tooltip label="Open command palette (⌘K)">
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconCommand size={14} />}
                onClick={() => setCommandPaletteOpened(true)}
              >
                Commands
              </Button>
            </Tooltip>
            <Button size="compact-md" onClick={handleDailyNote}>
              Daily Note
            </Button>
            <ThemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Navigation
              </Text>
            </Group>
          </Stack>
        </AppShell.Section>

        <AppShell.Section grow mt="md" style={{ overflowY: 'auto' }}>
          <Stack gap="lg">
            {navLinkGroups.map((group) => (
              <Stack key={group.title} gap="xs">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" pl="xs">
                  {group.title}
                </Text>
                <Stack gap={2}>
                  {group.links.map((link) => (
                    <NavLink
                      to={link.to}
                      key={link.label}
                      className={({ isActive }) => `${classes.navLink} ${isActive ? classes.navLinkActive : ''}`}
                    >
                      <Group gap="xs">
                        <link.icon size={18} />
                        <span>{link.label}</span>
                      </Group>
                    </NavLink>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider my="xs" />
          <Text size="xs" c="dimmed" ta="center">
            v1.0.0 • Local-first
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <CommandPalette opened={commandPaletteOpened} onClose={() => setCommandPaletteOpened(false)} />
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default MainLayout;
