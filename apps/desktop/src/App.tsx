import { MantineProvider } from '@mantine/core';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { theme } from './theme';
import { useStore } from './store';
import { useSpaces } from './hooks/useQueries';
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
import SyncStatus from './components/SyncStatus';
import UserManagement from './components/UserManagement';
import FormTemplates from './components/FormTemplates';
import LocalAnalytics from './components/LocalAnalytics';

function App() {
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

  return (
    <MantineProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<VaultManagement />} />
          <Route path="/main" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="editor" element={<NoteEditor />} />
            <Route path="tasks" element={<TaskBoard />} />
            <Route path="projects" element={<ProjectHub />}>
              <Route index element={<Overview />} />
              <Route path="kanban" element={<Kanban />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="risks" element={<Risks />} />
            </Route>
            <Route path="searches" element={<SavedSearches spaceId={activeSpaceId || ''} />} />
            <Route path="review" element={<WeeklyReview spaceId={activeSpaceId || ''} />} />
            <Route path="meetings" element={<MeetingNotes />} />
            <Route path="modes" element={<ModeStore spaceId={activeSpaceId || ''} />} />
            <Route path="srs" element={<SpacedRepetition />} />
            <Route path="settings" element={<Settings />} />
            <Route path="import" element={<AdvancedImport spaceId={activeSpaceId || ''} />} />
            <Route path="search" element={<EnhancedSearch />} />
            <Route path="sync" element={<SyncStatus />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="templates" element={<FormTemplates />} />
            <Route path="analytics" element={<LocalAnalytics />} />
          </Route>
        </Routes>
      </Router>
    </MantineProvider>
  );
}

export default App;
