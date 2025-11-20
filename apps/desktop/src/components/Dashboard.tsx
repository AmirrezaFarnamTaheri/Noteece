import { Grid, Title, Group, Stack, Paper, Text, useMantineTheme, LoadingOverlay, Container, Button, SegmentedControl } from '@mantine/core';
import { IconArrowUpRight, IconCheck, IconClock, IconLayoutGrid, IconList, IconX, IconEye, IconEyeOff } from '@tabler/icons-react';
import React, { useState } from 'react';
import { useProjects } from '../hooks/useQueries';
import { useStore } from '../store';
import classes from './Dashboard.module.css';
import { Activity } from './activity';
import { BarChart } from './bar-chart';
import { StatsCard } from './stats-card';
import { Upcoming } from './upcoming';
import { AchievementBadgesWidget } from './widgets/AchievementBadgesWidget';
import { BookmarksWidget } from './widgets/BookmarksWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
import DueTodayWidget from './widgets/DueTodayWidget';
import { FocusTimer } from './widgets/FocusTimer';
import { GoalsTrackerWidget } from './widgets/GoalsTrackerWidget';
import HabitsTracker from './widgets/HabitsTracker';
import { HealthWidget } from './widgets/HealthWidget';
import InsightsWidget from './widgets/InsightsWidget';
import MoodTracker from './widgets/MoodTracker';
import { MusicWidget } from './widgets/MusicWidget';
import NotesHeatmap from './widgets/NotesHeatmap';
import { NotesStatsWidget } from './widgets/NotesStatsWidget';
import ProjectTimeline from './widgets/ProjectTimeline';
import { QuickCapture } from './widgets/QuickCapture';
import { RecentProjects } from './widgets/RecentProjects';
import { SocialWidget } from './widgets/SocialWidget';
import { TagsCloud } from './widgets/TagsCloud';
import { TasksByPriority } from './widgets/TasksByPriority';
import TimeTrackingWidget from './widgets/TimeTrackingWidget';
import { UniversalDashboardWidget } from './widgets/UniversalDashboardWidget';
import { WeeklyProgress } from './widgets/WeeklyProgress';

const Dashboard: React.FC = () => {
  const theme = useMantineTheme();
  const { activeSpaceId } = useStore();
  const { data: projects = [], isLoading } = useProjects(activeSpaceId || '', !!activeSpaceId);
  const [focusMode, setFocusMode] = useState(false);

  const completedProjects = projects.filter((project) => project.status === 'done').length;
  const inProgressProjects = projects.filter((project) => project.status === 'active').length;
  const archivedProjects = projects.filter((project) => project.status === 'archived').length;

  return (
    <Container fluid className={classes.container} p="xl" style={{ backgroundColor: theme.colors.dark[8], minHeight: '100vh' }}>
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1} fw={800} style={{ letterSpacing: '-1px', color: theme.colors.gray[0] }}>
              Dashboard
            </Title>
            <Text c="dimmed" size="md" mt="xs">
              Welcome back to your workspace
            </Text>
          </div>
          <Group>
             <Button
               variant="light"
               color={focusMode ? 'indigo' : 'gray'}
               leftSection={focusMode ? <IconEyeOff size={18} /> : <IconEye size={18} />}
               onClick={() => setFocusMode(!focusMode)}
             >
               {focusMode ? 'Exit Focus' : 'Focus Mode'}
             </Button>
             <IconLayoutGrid size={24} color={theme.colors.gray[6]} />
          </Group>
        </Group>

        {/* Top Row: Core Widgets */}
        {!focusMode && (
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
              <UniversalDashboardWidget />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
              <HealthWidget />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
              <Stack gap="lg">
                <MusicWidget />
                <QuickCapture />
              </Stack>
            </Grid.Col>
          </Grid>
        )}

        {/* Project Status Stats Cards */}
        {!focusMode && (
        <Grid gutter="lg">
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconList size={24} color={theme.colors.dark[0]} />}
              title="All Projects"
              value={projects.length.toString()}
              color={theme.colors.indigo[6]}
              backgroundColor={theme.colors.indigo[9]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconCheck size={24} color={theme.colors.teal[1]} />}
              title="Completed"
              value={completedProjects.toString()}
              color={theme.colors.teal[6]}
              backgroundColor={theme.colors.teal[9]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconClock size={24} color={theme.colors.yellow[1]} />}
              title="In Progress"
              value={inProgressProjects.toString()}
              color={theme.colors.yellow[6]}
              backgroundColor={theme.colors.yellow[9]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconX size={24} color={theme.colors.red[1]} />}
              title="Archived"
              value={archivedProjects.toString()}
              color={theme.colors.red[6]}
              backgroundColor={theme.colors.red[9]}
            />
          </Grid.Col>
        </Grid>
        )}

        {/* Main Content: 3 Column Layout */}
        <Grid gutter="lg">
          {/* Left Column: Tasks & Projects */}
          <Grid.Col span={{ base: 12, md: focusMode ? 6 : 4 }}>
            <Stack gap="lg">
              <Upcoming icon={<IconLayoutGrid size={24} />} title="Upcoming Tasks" />
              <DueTodayWidget />
              <TasksByPriority />
              {!focusMode && <ProjectTimeline />}
              {!focusMode && <WeeklyProgress />}
              {!focusMode && <RecentProjects />}
            </Stack>
          </Grid.Col>

          {/* Middle Column: Activity & Content */}
          <Grid.Col span={{ base: 12, md: focusMode ? 6 : 4 }}>
            <Stack gap="lg">
              <FocusTimer />
              {!focusMode && (
                <Paper p="lg" radius="lg" shadow="sm" withBorder>
                  <Group justify="space-between" mb="md">
                    <Title order={3} size="h4">Project Stats</Title>
                    <IconArrowUpRight size={20} color={theme.colors.gray[6]} />
                  </Group>
                  <BarChart data={projects} />
                </Paper>
              )}
              {!focusMode && <NotesHeatmap />}
              <Activity icon={<IconLayoutGrid size={24} />} title="Recent Activity" />
              {!focusMode && <SocialWidget />}
              {!focusMode && <NotesStatsWidget />}
            </Stack>
          </Grid.Col>

          {/* Right Column: Personal & Tracking - Hidden in Focus Mode */}
          {!focusMode && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="lg">
                <CalendarWidget />
                <HabitsTracker />
                <MoodTracker />
                <InsightsWidget />
                <GoalsTrackerWidget />
                <AchievementBadgesWidget />
                <BookmarksWidget />
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
