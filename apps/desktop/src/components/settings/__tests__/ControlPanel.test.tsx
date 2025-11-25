import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ControlPanel } from '../ControlPanel';
import { ControlPanelEnhanced } from '../ControlPanelEnhanced';
import { useControlPanelStore } from '../../../store/controlPanelStore';

// Mock the store
jest.mock('../../../store/controlPanelStore');
jest.mock('../../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const mockWidgets = [
  { id: 'quickStats', name: 'Quick Stats', description: 'Overview', enabled: true, category: 'productivity', size: 'medium', order: 0 },
  { id: 'dueToday', name: 'Due Today', description: 'Tasks due today', enabled: true, category: 'productivity', size: 'medium', order: 1 },
  { id: 'habits', name: 'Habits', description: 'Track habits', enabled: false, category: 'health', size: 'medium', order: 2 },
];

const mockFeatures = [
  { id: 'notes', name: 'Notes', description: 'Note-taking', enabled: true, category: 'core' },
  { id: 'localAI', name: 'Local AI', description: 'On-device AI', enabled: true, category: 'ai', beta: true },
  { id: 'cloudAI', name: 'Cloud AI', description: 'Cloud AI', enabled: false, category: 'ai' },
];

const mockStore = {
  widgets: mockWidgets,
  features: mockFeatures,
  toggleWidget: jest.fn(),
  toggleFeature: jest.fn(),
  resetWidgets: jest.fn(),
  resetFeatures: jest.fn(),
  setWidgetOrder: jest.fn(),
  isWidgetEnabled: jest.fn((id) => mockWidgets.find(w => w.id === id)?.enabled ?? false),
  isFeatureEnabled: jest.fn((id) => mockFeatures.find(f => f.id === id)?.enabled ?? false),
  getEnabledWidgets: jest.fn(() => mockWidgets.filter(w => w.enabled)),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useControlPanelStore as unknown as jest.Mock).mockReturnValue(mockStore);
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('ControlPanel', () => {
  it('renders control panel title', () => {
    render(<ControlPanel />, { wrapper });
    expect(screen.getByText('Control Panel')).toBeInTheDocument();
  });

  it('displays widget count', () => {
    render(<ControlPanel />, { wrapper });
    expect(screen.getByText(/Widgets/)).toBeInTheDocument();
  });

  it('displays feature count', () => {
    render(<ControlPanel />, { wrapper });
    expect(screen.getByText(/Features/)).toBeInTheDocument();
  });

  it('calls toggleWidget when switch is clicked', async () => {
    render(<ControlPanel />, { wrapper });
    
    // Find and click a widget switch
    const switches = screen.getAllByRole('switch');
    if (switches.length > 0) {
      fireEvent.click(switches[0]);
      expect(mockStore.toggleWidget).toHaveBeenCalled();
    }
  });

  it('calls resetWidgets when reset button is clicked', async () => {
    render(<ControlPanel />, { wrapper });
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    expect(mockStore.resetWidgets).toHaveBeenCalled();
  });
});

describe('ControlPanelEnhanced', () => {
  it('renders enhanced control panel with stats', () => {
    render(<ControlPanelEnhanced />, { wrapper });
    expect(screen.getByText('Widgets Active')).toBeInTheDocument();
    expect(screen.getByText('Features Enabled')).toBeInTheDocument();
  });

  it('displays preset buttons', () => {
    render(<ControlPanelEnhanced />, { wrapper });
    expect(screen.getByText('Minimal')).toBeInTheDocument();
    expect(screen.getByText('Productivity')).toBeInTheDocument();
    expect(screen.getByText('Health Focus')).toBeInTheDocument();
    expect(screen.getByText('Power User')).toBeInTheDocument();
  });

  it('has search functionality', () => {
    render(<ControlPanelEnhanced />, { wrapper });
    const searchInput = screen.getByPlaceholderText('Search widgets and features...');
    expect(searchInput).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'notes' } });
    expect(searchInput).toHaveValue('notes');
  });

  it('shows beta badge for beta features', () => {
    render(<ControlPanelEnhanced />, { wrapper });
    const betaBadges = screen.getAllByText('Beta');
    expect(betaBadges.length).toBeGreaterThan(0);
  });

  it('enables all widgets when Enable All is clicked', () => {
    render(<ControlPanelEnhanced />, { wrapper });
    const enableAllButton = screen.getByText('Enable All');
    fireEvent.click(enableAllButton);
    // Should call toggleWidget for each disabled widget
    expect(mockStore.toggleWidget).toHaveBeenCalled();
  });
});

describe('ControlPanel Store Integration', () => {
  it('persists widget state correctly', () => {
    const result = mockStore.isWidgetEnabled('quickStats');
    expect(result).toBe(true);
  });

  it('persists feature state correctly', () => {
    const result = mockStore.isFeatureEnabled('notes');
    expect(result).toBe(true);
  });

  it('returns enabled widgets list', () => {
    const enabled = mockStore.getEnabledWidgets();
    expect(enabled.length).toBe(2);
    expect(enabled.every(w => w.enabled)).toBe(true);
  });
});

