import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import SyncStatus from '../SyncStatus';
import '@testing-library/jest-dom';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('SyncStatus', () => {
  it('renders sync status page', () => {
    renderWithProviders(<SyncStatus />);
    expect(screen.getByText('Sync Status')).toBeInTheDocument();
  });

  it('displays sync button', () => {
    renderWithProviders(<SyncStatus />);
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
  });

  it('shows devices tab', () => {
    renderWithProviders(<SyncStatus />);
    expect(screen.getByRole('tab', { name: /devices/i })).toBeInTheDocument();
  });

  it('shows conflicts tab with count', () => {
    renderWithProviders(<SyncStatus />);
    const conflictsTab = screen.getByRole('tab', { name: /conflicts/i });
    expect(conflictsTab).toBeInTheDocument();
    expect(conflictsTab).toHaveTextContent('1');
  });

  it('shows history tab', () => {
    renderWithProviders(<SyncStatus />);
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
  });

  it('displays sync settings button', () => {
    renderWithProviders(<SyncStatus />);
    expect(screen.getByLabelText('Sync settings')).toBeInTheDocument();
  });

  it('handles manual sync trigger', async () => {
    renderWithProviders(<SyncStatus />);
    const syncButton = screen.getByRole('button', { name: /sync now/i });

    fireEvent.click(syncButton);

    // Button should show loading state
    await waitFor(() => {
      expect(syncButton).toHaveAttribute('data-loading', 'true');
    });
  });

  it('opens settings modal when settings button clicked', () => {
    renderWithProviders(<SyncStatus />);
    const settingsButton = screen.getByLabelText('Sync settings');

    fireEvent.click(settingsButton);

    expect(screen.getByText('Sync Settings')).toBeInTheDocument();
  });

  it('displays device list', () => {
    renderWithProviders(<SyncStatus />);
    // Default view shows devices
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('Windows Desktop')).toBeInTheDocument();
    expect(screen.getByText('iPad')).toBeInTheDocument();
  });

  it('displays unresolved conflicts alert', () => {
    renderWithProviders(<SyncStatus />);
    expect(screen.getByText(/sync conflicts detected/i)).toBeInTheDocument();
    expect(screen.getByText(/1 unresolved sync conflict/i)).toBeInTheDocument();
  });
});
