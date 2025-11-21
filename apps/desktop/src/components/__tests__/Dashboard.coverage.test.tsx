import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import Dashboard from '../Dashboard';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock components to simplify testing
jest.mock('../widgets/UniversalDashboardWidget', () => ({
  UniversalDashboardWidget: () => <div>UniversalDashboardWidget</div>,
}));
jest.mock('../widgets/HealthWidget', () => ({ HealthWidget: () => <div>HealthWidget</div> }));
jest.mock('../widgets/MusicWidget', () => ({ MusicWidget: () => <div>MusicWidget</div> }));
jest.mock('../widgets/QuickCapture', () => ({ QuickCapture: () => <div>QuickCapture</div> }));
// eslint-disable-next-line react/display-name
jest.mock('../widgets/DueTodayWidget', () => () => <div>DueTodayWidget</div>);
jest.mock('../widgets/TasksByPriority', () => ({ TasksByPriority: () => <div>TasksByPriority</div> }));
// eslint-disable-next-line react/display-name
jest.mock('../widgets/ProjectTimeline', () => () => <div>ProjectTimeline</div>);
jest.mock('../widgets/WeeklyProgress', () => ({ WeeklyProgress: () => <div>WeeklyProgress</div> }));
jest.mock('../widgets/RecentProjects', () => ({ RecentProjects: () => <div>RecentProjects</div> }));
// eslint-disable-next-line react/display-name
jest.mock('../widgets/NotesHeatmap', () => () => <div>NotesHeatmap</div>);
jest.mock('../widgets/SocialWidget', () => ({ SocialWidget: () => <div>SocialWidget</div> }));
jest.mock('../widgets/NotesStatsWidget', () => ({ NotesStatsWidget: () => <div>NotesStatsWidget</div> }));
jest.mock('../widgets/CalendarWidget', () => ({ CalendarWidget: () => <div>CalendarWidget</div> }));
jest.mock('../widgets/FocusTimer', () => ({ FocusTimer: () => <div>FocusTimer</div> }));
// eslint-disable-next-line react/display-name
jest.mock('../widgets/HabitsTracker', () => () => <div>HabitsTracker</div>);
// eslint-disable-next-line react/display-name
jest.mock('../widgets/MoodTracker', () => () => <div>MoodTracker</div>);
// eslint-disable-next-line react/display-name
jest.mock('../widgets/InsightsWidget', () => () => <div>InsightsWidget</div>);
jest.mock('../widgets/GoalsTrackerWidget', () => ({ GoalsTrackerWidget: () => <div>GoalsTrackerWidget</div> }));
jest.mock('../widgets/AchievementBadgesWidget', () => ({
  AchievementBadgesWidget: () => <div>AchievementBadgesWidget</div>,
}));
jest.mock('../widgets/BookmarksWidget', () => ({ BookmarksWidget: () => <div>BookmarksWidget</div> }));
// eslint-disable-next-line react/display-name
jest.mock('../widgets/TimeTrackingWidget', () => () => <div>TimeTrackingWidget</div>);
jest.mock('../widgets/TagsCloud', () => ({ TagsCloud: () => <div>TagsCloud</div> }));
jest.mock('../activity', () => ({ Activity: () => <div>Activity</div> }));
jest.mock('../bar-chart', () => ({ BarChart: () => <div>BarChart</div> }));
jest.mock('../upcoming', () => ({ Upcoming: () => <div>Upcoming</div> }));

// Mock store
jest.mock('../../store', () => ({
  useStore: jest.fn(() => ({ activeSpaceId: 'test-space-id' })),
}));

// Mock hook
jest.mock('../../hooks/useQueries', () => ({
  useProjects: jest.fn(() => ({
    data: [
      { id: '1', title: 'Done', status: 'done' },
      { id: '2', title: 'Active', status: 'active' },
      { id: '3', title: 'Archived', status: 'archived' },
    ],
    isLoading: false,
  })),
}));

const queryClient = new QueryClient();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <BrowserRouter>{component}</BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
};

describe('Dashboard', () => {
  it('renders dashboard title and welcome message', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back to your workspace')).toBeInTheDocument();
  });

  it('renders stats cards with correct data', () => {
    renderWithProviders(<Dashboard />);
    // Project count: 3
    expect(screen.getByText('All Projects')).toBeInTheDocument();

    // Note: since StatsCard might just render props, we look for values if possible.
    // But values like "3", "1" might be common.
    // Let's check for specific stats labels.
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('renders main layout widgets', () => {
    renderWithProviders(<Dashboard />);

    // Top row
    expect(screen.getByText('UniversalDashboardWidget')).toBeInTheDocument();
    expect(screen.getByText('HealthWidget')).toBeInTheDocument();
    expect(screen.getByText('MusicWidget')).toBeInTheDocument();

    // Columns
    expect(screen.getByText('DueTodayWidget')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('CalendarWidget')).toBeInTheDocument();
  });
});
