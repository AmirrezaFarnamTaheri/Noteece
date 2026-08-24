import { MantineProvider, Loader, Center } from '@mantine/core';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import { useStore } from './store';
import { useSpaces } from './hooks/useQueries';
import { ErrorBoundary } from './components/ErrorBoundary';
import VaultManagement from './components/VaultManagement';
import MainLayout from './components/MainLayout';

const Dashboard = lazy(() => import('./components/Dashboard'));
const NoteEditor = lazy(() => import('./components/NoteEditor'));
const TaskBoard = lazy(() => import('./components/TaskBoard'));
const ProjectHub = lazy(() => import('./components/ProjectHub'));
const SavedSearches = lazy(() => import('./components/SavedSearches'));
const WeeklyReview = lazy(() => import('./components/WeeklyReview'));
const MeetingNotes = lazy(() => import('./components/MeetingNotes'));
const ModeStore = lazy(() => import('./components/ModeStore'));
const SpacedRepetition = lazy(() => import('./components/SpacedRepetition'));
const Settings = lazy(() => import('./components/Settings'));
const AdvancedImport = lazy(() => import('./components/AdvancedImport'));
const EnhancedSearch = lazy(() => import('./components/EnhancedSearch'));
const Overview = lazy(() => import('./components/project_hub/Overview'));
const Kanban = lazy(() => import('./components/project_hub/Kanban'));
const Timeline = lazy(() => import('./components/project_hub/Timeline'));
const Risks = lazy(() => import('./components/project_hub/Risks'));
const SyncStatus = lazy(() => import('./components/sync').then(m => ({ default: m.SyncStatus })));
const UserManagement = lazy(() => import('./components/user-management'));
const FormTemplates = lazy(() => import('./components/FormTemplates'));
const LocalAnalytics = lazy(() => import('./components/LocalAnalytics'));
const OcrManager = lazy(() => import('./components/OcrManager').then(m => ({ default: m.OcrManager })));
const Journal = lazy(() => import('./pages/Journal'));
const Habits = lazy(() => import('./pages/Habits'));

function LoadingFallback() {
  return <Center h="100vh"><Loader /></Center>;
}

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
              { index: true, element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense></ErrorBoundary> },
              { path: 'editor', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><NoteEditor /></Suspense></ErrorBoundary> },
              { path: 'tasks', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><TaskBoard /></Suspense></ErrorBoundary> },
              {
                path: 'projects',
                element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><ProjectHub /></Suspense></ErrorBoundary>,
                children: [
                  { index: true, element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><Overview /></Suspense></ErrorBoundary> },
                  { path: 'kanban', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><Kanban /></Suspense></ErrorBoundary> },
                  { path: 'timeline', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><Timeline /></Suspense></ErrorBoundary> },
                  { path: 'risks', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><Risks /></Suspense></ErrorBoundary> },
                ],
              },
              { path: 'searches', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><ActiveSpaceRoute Component={SavedSearches} /></Suspense></ErrorBoundary> },
              { path: 'review', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><ActiveSpaceRoute Component={WeeklyReview} /></Suspense></ErrorBoundary> },
              { path: 'journal', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><ActiveSpaceRoute Component={Journal} /></Suspense></ErrorBoundary> },
              { path: 'habits', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><ActiveSpaceRoute Component={Habits} /></Suspense></ErrorBoundary> },
              { path: 'meetings', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><MeetingNotes /></Suspense></ErrorBoundary> },
              { path: 'modes', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><ActiveSpaceRoute Component={ModeStore} /></Suspense></ErrorBoundary> },
              { path: 'srs', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><SpacedRepetition /></Suspense></ErrorBoundary> },
              { path: 'settings', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><Settings /></Suspense></ErrorBoundary> },
              { path: 'import', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><ActiveSpaceRoute Component={AdvancedImport} /></Suspense></ErrorBoundary> },
              { path: 'search', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><EnhancedSearch /></Suspense></ErrorBoundary> },
              { path: 'sync', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><SyncStatus /></Suspense></ErrorBoundary> },
              { path: 'users', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><UserManagement /></Suspense></ErrorBoundary> },
              { path: 'templates', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><FormTemplates /></Suspense></ErrorBoundary> },
              { path: 'analytics', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><LocalAnalytics /></Suspense></ErrorBoundary> },
              { path: 'ocr', element: <ErrorBoundary><Suspense fallback={<LoadingFallback />}><OcrManager /></Suspense></ErrorBoundary> },
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
      <MantineProvider theme={theme}>
        <Notifications position="top-right" zIndex={9999} />
        <RouterProvider router={router} />
      </MantineProvider>
    </ErrorBoundary>
  );
}

export default App;
