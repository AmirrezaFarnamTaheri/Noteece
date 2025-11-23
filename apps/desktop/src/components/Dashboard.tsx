import {
  Grid,
  Title,
  Group,
  Stack,
  Text,
  useMantineTheme,
  LoadingOverlay,
  Container,
  Button,
  Card,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconCheck,
  IconClock,
  IconLayoutGrid,
  IconList,
  IconEye,
  IconEyeOff,
  IconChartPie,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import { useProjects } from '../hooks/useQueries';
import { useStore } from '../store';
import classes from './Dashboard.module.css';
import { Activity } from './activity';
import { BarChart } from './bar-chart';
import { StatsCard } from './stats-card';
import DueTodayWidget from './widgets/DueTodayWidget';
import { FocusTimer } from './widgets/FocusTimer';
import { GoalsTrackerWidget } from './widgets/GoalsTrackerWidget';
import HabitsTracker from './widgets/HabitsTracker';
import InsightsWidget from './widgets/InsightsWidget';
import { MusicWidget } from './widgets/MusicWidget';
import NotesHeatmap from './widgets/NotesHeatmap';
import { QuickCapture } from './widgets/QuickCapture';
import { RecentProjects } from './widgets/RecentProjects';
import { TagsCloud } from './widgets/TagsCloud';
import { TasksByPriority } from './widgets/TasksByPriority';
import TimeTrackingWidget from './widgets/TimeTrackingWidget';
import { UniversalDashboardWidget } from './widgets/UniversalDashboardWidget';
import { CalendarWidget } from './widgets/CalendarWidget';

const Dashboard: React.FC = () => {
  const theme = useMantineTheme();
  const { activeSpaceId } = useStore();
  const { data: projects = [], isLoading } = useProjects(activeSpaceId || '', !!activeSpaceId);
  const [focusMode, setFocusMode] = useState(false);

  const completedProjects = projects.filter((project) => project.status === 'done').length;
  const inProgressProjects = projects.filter((project) => project.status === 'active').length;

  return (
    <Container
      fluid
      className={classes.container}
      p="xl"
      style={{
          backgroundColor: theme.colors.dark[9],
          minHeight: '100vh',
          backgroundImage: 'radial-gradient(circle at 90% 10%, rgba(132, 94, 247, 0.08) 0%, transparent 40%)'
      }}
    >
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1} fw={900} style={{ letterSpacing: '-1px', fontSize: '2.5rem' }}>
              <Text span inherit variant="gradient" gradient={{ from: 'violet.2', to: 'white' }}>
                Dashboard
              </Text>
            </Title>
            <Text c="dimmed" size="md" mt={4} fw={500}>
              Your personal command center
            </Text>
          </div>
          <Group>
            <Button
              variant="light"
              color={focusMode ? 'indigo' : 'gray'}
              radius="md"
              leftSection={focusMode ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              onClick={() => setFocusMode(!focusMode)}
            >
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </Button>
          </Group>
        </Group>

        {/* Top Row: Core Widgets - Highly Visual */}
        {!focusMode && (
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, lg: 8 }}>
                {/* Universal Widget (Merged Health/Stats) */}
               <UniversalDashboardWidget />
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Stack gap="lg" h="100%">
                <MusicWidget />
                <QuickCapture />
              </Stack>
            </Grid.Col>
          </Grid>
        )}

        {/* Project Stats Row - Clean Cards */}
        {!focusMode && (
          <Grid gutter="lg">
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatsCard
                icon={<IconList size={20} />}
                title="Total Projects"
                value={projects.length.toString()}
                color="indigo"
                backgroundColor="rgba(76, 110, 245, 0.1)"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatsCard
                icon={<IconCheck size={20} />}
                title="Completed"
                value={completedProjects.toString()}
                color="teal"
                backgroundColor="rgba(20, 177, 166, 0.1)"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatsCard
                icon={<IconClock size={20} />}
                title="In Progress"
                value={inProgressProjects.toString()}
                color="violet"
                backgroundColor="rgba(132, 94, 247, 0.1)"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatsCard
                icon={<IconChartPie size={20} />}
                title="Completion Rate"
                value={`${projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0}%`}
                color="cyan"
                backgroundColor="rgba(34, 184, 207, 0.1)"
              />
            </Grid.Col>
          </Grid>
        )}

        {/* Main Content Layout */}
        <Grid gutter="lg">
          {/* Left Column: Actionable Items */}
          <Grid.Col span={{ base: 12, md: focusMode ? 6 : 4 }}>
            <Stack gap="lg">
              <Card withBorder radius="lg" p="md" style={{ backgroundColor: theme.colors.dark[8] }}>
                  <Group justify="space-between" mb="md">
                      <Group gap="xs">
                          <ThemeIcon color="violet" variant="light" radius="md">
                              <IconLayoutGrid size={18} />
                          </ThemeIcon>
                          <Text fw={700}>Priority Tasks</Text>
                      </Group>
                  </Group>
                  <TasksByPriority />
              </Card>

              <DueTodayWidget />
              {!focusMode && <RecentProjects />}
            </Stack>
          </Grid.Col>

          {/* Middle Column: Visuals & Content */}
          <Grid.Col span={{ base: 12, md: focusMode ? 6 : 4 }}>
            <Stack gap="lg">
              <FocusTimer />
              {!focusMode && (
                <Card withBorder radius="lg" p="lg" style={{ backgroundColor: theme.colors.dark[8] }}>
                  <Group justify="space-between" mb="md">
                    <Title order={4}>Project Trajectory</Title>
                    <IconArrowUpRight size={20} color={theme.colors.gray[6]} />
                  </Group>
                  <BarChart data={projects} />
                </Card>
              )}
              {!focusMode && <NotesHeatmap />}
              <Activity icon={<IconClock size={18} />} title="Recent Activity" />
            </Stack>
          </Grid.Col>

          {/* Right Column: "Quantified Self" & System */}
          {!focusMode && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="lg">
                <GoalsTrackerWidget />
                <HabitsTracker />
                <CalendarWidget />
                <InsightsWidget />
                <TimeTrackingWidget />
                <TagsCloud />
              </Stack>
            </Grid.Col>
          )}
        </Grid>
      </Stack>
    </Container>
  );
};

export default Dashboard;
