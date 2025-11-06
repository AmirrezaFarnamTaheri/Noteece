import { Grid, Title, Group, Stack, Paper, Text, useMantineTheme, LoadingOverlay } from '@mantine/core';
import {
  IconArrowUpRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFileText,
  IconList,
  IconX,
  IconLayoutGrid,
} from '@tabler/icons-react';
import React from 'react';
import classes from './Dashboard.module.css';
import { Activity } from './activity';
import { BarChart } from './bar-chart';
import { StatsCard } from './stats-card';
import { Upcoming } from './upcoming';
import { TasksByPriority } from './widgets/TasksByPriority';
import { TagsCloud } from './widgets/TagsCloud';
import { QuickCapture } from './widgets/QuickCapture';
import { WeeklyProgress } from './widgets/WeeklyProgress';
import { RecentProjects } from './widgets/RecentProjects';
import { FocusTimer } from './widgets/FocusTimer';
import NotesHeatmap from './widgets/NotesHeatmap';
import ProjectTimeline from './widgets/ProjectTimeline';
import DueTodayWidget from './widgets/DueTodayWidget';
import HabitsTracker from './widgets/HabitsTracker';
import MoodTracker from './widgets/MoodTracker';
import InsightsWidget from './widgets/InsightsWidget';
import { GoalsTrackerWidget } from './widgets/GoalsTrackerWidget';
import { NotesStatsWidget } from './widgets/NotesStatsWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
import { BookmarksWidget } from './widgets/BookmarksWidget';
import { QuickStatsWidget } from './widgets/QuickStatsWidget';
import { AchievementBadgesWidget } from './widgets/AchievementBadgesWidget';
import TimeTrackingWidget from './widgets/TimeTrackingWidget';
import { useProjects } from '../hooks/useQueries';
import { useStore } from '../store';

const Dashboard: React.FC = () => {
  const theme = useMantineTheme();
  const { activeSpaceId } = useStore();
  const { data: projects = [], isLoading } = useProjects(activeSpaceId || '', !!activeSpaceId);

  const completedProjects = projects.filter((project) => project.status === 'done').length;
  const inProgressProjects = projects.filter((project) => project.status === 'active').length;
  const archivedProjects = projects.filter((project) => project.status === 'archived').length;

  return (
    <div className={classes.container}>
      <LoadingOverlay visible={isLoading} />

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Dashboard</Title>
          <IconLayoutGrid size={24} color={theme.colors.gray[6]} />
        </Group>

        {/* Quick Stats Row */}
        <Grid>
          <Grid.Col span={{ lg: 3, md: 6, sm: 12 }}>
            <StatsCard
              icon={<IconList size={24} color={theme.colors.gray[2]} />}
              title="All Projects"
              value={projects.length.toString()}
              color={theme.colors.gray[7]}
              backgroundColor={theme.colors.gray[0]}
            />
          </Grid.Col>
          <Grid.Col span={{ lg: 3, md: 6, sm: 12 }}>
            <StatsCard
              icon={<IconCheck size={24} color={theme.colors.green[2]} />}
              title="Completed"
              value={completedProjects.toString()}
              color={theme.colors.green[7]}
              backgroundColor={theme.colors.green[0]}
            />
          </Grid.Col>
          <Grid.Col span={{ lg: 3, md: 6, sm: 12 }}>
            <StatsCard
              icon={<IconClock size={24} color={theme.colors.orange[2]} />}
              title="In Progress"
              value={inProgressProjects.toString()}
              color={theme.colors.orange[7]}
              backgroundColor={theme.colors.orange[0]}
            />
          </Grid.Col>
          <Grid.Col span={{ lg: 3, md: 6, sm: 12 }}>
            <StatsCard
              icon={<IconX size={24} color={theme.colors.red[2]} />}
              title="Archived"
              value={archivedProjects.toString()}
              color={theme.colors.red[7]}
              backgroundColor={theme.colors.red[0]}
            />
          </Grid.Col>
        </Grid>

        {/* Main Content Row */}
        <Grid>
          <Grid.Col span={{ lg: 8, md: 12, sm: 12 }}>
            <Stack gap="md">
              {/* Project Statistics Chart */}
              <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
                <Group justify="space-between">
                  <Title order={3}>Project Statistics</Title>
                  <IconArrowUpRight size={24} color={theme.colors.gray[6]} />
                </Group>
                <Text c="dimmed" fz="sm" mb="xl">
                  Track your progress and check your project statistics
                </Text>
                <BarChart data={projects} />
              </Paper>

              {/* Quick Capture */}
              <QuickCapture />

              {/* Quick Stats Overview */}
              <QuickStatsWidget />

              {/* New: Activity Heatmap and Insights */}
              <Grid>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <NotesHeatmap />
                </Grid.Col>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <InsightsWidget />
                </Grid.Col>
              </Grid>

              {/* New: Due Today and Habits */}
              <Grid>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <DueTodayWidget />
                </Grid.Col>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <HabitsTracker />
                </Grid.Col>
              </Grid>

              {/* Goals and Achievements */}
              <Grid>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <GoalsTrackerWidget />
                </Grid.Col>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <AchievementBadgesWidget />
                </Grid.Col>
              </Grid>

              {/* Notes Stats */}
              <NotesStatsWidget />

              {/* Tasks and Activity Row */}
              <Grid>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <Upcoming icon={<IconCalendar size={24} />} title="Upcoming Tasks" />
                </Grid.Col>
                <Grid.Col span={{ lg: 6, md: 12, sm: 12 }}>
                  <Activity icon={<IconFileText size={24} />} title="Recent Activity" />
                </Grid.Col>
              </Grid>
            </Stack>
          </Grid.Col>

          {/* Right Sidebar Widgets */}
          <Grid.Col span={{ lg: 4, md: 12, sm: 12 }}>
            <Stack gap="md">
              <CalendarWidget />
              <BookmarksWidget />
              <FocusTimer />
              <TimeTrackingWidget />
              <MoodTracker />
              <ProjectTimeline />
              <WeeklyProgress />
              <TasksByPriority />
              <RecentProjects />
              <TagsCloud />
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </div>
  );
};

export default Dashboard;
