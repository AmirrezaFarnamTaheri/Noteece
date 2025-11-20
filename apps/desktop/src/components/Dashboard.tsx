import { Grid, Title, Group, Stack, Paper, Text, useMantineTheme, LoadingOverlay, Container } from '@mantine/core';
import { IconArrowUpRight, IconCheck, IconClock, IconLayoutGrid, IconList, IconX } from '@tabler/icons-react';
import React from 'react';
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

  const completedProjects = projects.filter((project) => project.status === 'done').length;
  const inProgressProjects = projects.filter((project) => project.status === 'active').length;
  const archivedProjects = projects.filter((project) => project.status === 'archived').length;

  return (
    <Container fluid className={classes.container} p={0}>
      <LoadingOverlay visible={isLoading} />

      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Dashboard</Title>
            <Text c="dimmed" size="sm">
              Welcome back to your workspace
            </Text>
          </div>
          <IconLayoutGrid size={24} color={theme.colors.gray[6]} />
        </Group>

        {/* Top Row: Core Widgets */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
            <UniversalDashboardWidget />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
            <HealthWidget />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
            <Stack gap="md">
              <MusicWidget />
              <QuickCapture />
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Project Status Stats Cards */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconList size={24} color={theme.colors.gray[2]} />}
              title="All Projects"
              value={projects.length.toString()}
              color={theme.colors.gray[7]}
              backgroundColor={theme.colors.gray[0]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconCheck size={24} color={theme.colors.green[2]} />}
              title="Completed"
              value={completedProjects.toString()}
              color={theme.colors.green[7]}
              backgroundColor={theme.colors.green[0]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconClock size={24} color={theme.colors.orange[2]} />}
              title="In Progress"
              value={inProgressProjects.toString()}
              color={theme.colors.orange[7]}
              backgroundColor={theme.colors.orange[0]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <StatsCard
              icon={<IconX size={24} color={theme.colors.red[2]} />}
              title="Archived"
              value={archivedProjects.toString()}
              color={theme.colors.red[7]}
              backgroundColor={theme.colors.red[0]}
            />
          </Grid.Col>
        </Grid>

        {/* Main Content: 3 Column Layout */}
        <Grid gutter="md">
          {/* Left Column: Tasks & Projects */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Upcoming icon={<IconLayoutGrid size={24} />} title="Upcoming Tasks" />
              <DueTodayWidget />
              <TasksByPriority />
              <ProjectTimeline />
              <WeeklyProgress />
              <RecentProjects />
            </Stack>
          </Grid.Col>

          {/* Middle Column: Activity & Content */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
                <Group justify="space-between" mb="sm">
                  <Title order={3}>Project Stats</Title>
                  <IconArrowUpRight size={20} color={theme.colors.gray[6]} />
                </Group>
                <BarChart data={projects} />
              </Paper>
              <NotesHeatmap />
              <Activity icon={<IconLayoutGrid size={24} />} title="Recent Activity" />
              <SocialWidget />
              <NotesStatsWidget />
            </Stack>
          </Grid.Col>

          {/* Right Column: Personal & Tracking */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <CalendarWidget />
              <FocusTimer />
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
        </Grid>
      </Stack>
    </Container>
  );
};

export default Dashboard;
