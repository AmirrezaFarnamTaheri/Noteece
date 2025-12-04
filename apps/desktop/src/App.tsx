import { MantineProvider } from '@mantine/core';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import { useStore } from './store';
import { useSpaces } from './hooks/useQueries';
import { ErrorBoundary } from './components/ErrorBoundary';
import VaultManagement from './components/VaultManagement';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import NoteEditor from './components/NoteEditor';
import TaskBoard from './components/TaskBoard';
import ProjectHub from './components/ProjectHub';
import SavedSearches from './components/SavedSearches';
import WeeklyReview from './components/WeeklyReview';
import MeetingNotes from './components/MeetingNotes';
import ModeStore from './components/ModeStore';
import SpacedRepetition from './components/SpacedRepetition';
import Settings from './components/Settings';
import AdvancedImport from './components/AdvancedImport';
import EnhancedSearch from './components/EnhancedSearch';
import Overview from './components/project_hub/Overview';
import Kanban from './components/project_hub/Kanban';
import Timeline from './components/project_hub/Timeline';
import Risks from './components/project_hub/Risks';
import { SyncStatus } from './components/sync';
import UserManagement from './components/user-management';
import FormTemplates from './components/FormTemplates';
import LocalAnalytics from './components/LocalAnalytics';
import { OcrManager } from './components/OcrManager';

// Create a client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // 5 seconds
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Wrapper component to initialize spaces
function SpaceInitializer({ children }: { children: React.ReactNode }) {
  const { setSpaces, setActiveSpaceId, activeSpaceId } = useStore();
  const { data: spaces } = useSpaces();

  useEffect(() => {
    if (spaces && spaces.length > 0) {
      setSpaces(spaces);
      // Only set active space if not already set or if current active space doesn't exist
      if (!activeSpaceId || !spaces.some((s) => s.id === activeSpaceId)) {
        setActiveSpaceId(spaces[0].id);
      }
    }
  }, [spaces, setSpaces, setActiveSpaceId, activeSpaceId]);

  return <>{children}</>;
}

// Route wrapper for components that need activeSpaceId
function ActiveSpaceRoute({ Component }: { Component: React.ComponentType<{ spaceId: string }> }) {
  const { activeSpaceId } = useStore();
  return <Component spaceId={activeSpaceId || ''} />;
}

function App() {
  // Create router with future flags to eliminate warnings
  const router = useMemo(
    () =>
      createMemoryRouter(
        [
          {
            path: '/',
            element: <VaultManagement />,
            errorElement: <ErrorBoundary />,
          },
          {
            path: '/main',
            element: (
              <SpaceInitializer>
                <MainLayout />
              </SpaceInitializer>
            ),
            errorElement: <ErrorBoundary />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: 'editor', element: <NoteEditor /> },
              { path: 'tasks', element: <TaskBoard /> },
              {
                path: 'projects',
                element: <ProjectHub />,
                children: [
                  { index: true, element: <Overview /> },
                  { path: 'kanban', element: <Kanban /> },
                  { path: 'timeline', element: <Timeline /> },
                  { path: 'risks', element: <Risks /> },
                ],
              },
              { path: 'searches', element: <ActiveSpaceRoute Component={SavedSearches} /> },
              { path: 'review', element: <ActiveSpaceRoute Component={WeeklyReview} /> },
              { path: 'meetings', element: <MeetingNotes /> },
              { path: 'modes', element: <ActiveSpaceRoute Component={ModeStore} /> },
              { path: 'srs', element: <SpacedRepetition /> },
              { path: 'settings', element: <Settings /> },
              { path: 'import', element: <ActiveSpaceRoute Component={AdvancedImport} /> },
              { path: 'search', element: <EnhancedSearch /> },
              { path: 'sync', element: <SyncStatus /> },
              { path: 'users', element: <UserManagement /> },
              { path: 'templates', element: <FormTemplates /> },
              { path: 'analytics', element: <LocalAnalytics /> },
              { path: 'ocr', element: <OcrManager /> },
            ],
          },
        ],
        {
          future: {
            v7_relativeSplatPath: true,
          },
        },
      ),
    [],
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" zIndex={9999} />
          <RouterProvider router={router} />
        </MantineProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
