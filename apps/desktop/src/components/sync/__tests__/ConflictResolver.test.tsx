import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ConflictResolver } from '../ConflictResolver';
import { SyncConflict } from '../types';

const mockConflicts: SyncConflict[] = [
  {
    id: 'conflict1',
    entity_type: 'note',
    entity_id: 'note1',
    local_version: 3,
    remote_version: 4,
    conflict_data: JSON.stringify({ title: 'Test Note', content: 'Local content' }),
    created_at: Date.now() / 1000 - 3600,
  },
  {
    id: 'conflict2',
    entity_type: 'task',
    entity_id: 'task1',
    local_version: 2,
    remote_version: 3,
    conflict_data: JSON.stringify({ title: 'Test Task', status: 'pending' }),
    created_at: Date.now() / 1000 - 1800,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ConflictResolver', () => {
  const mockOnResolve = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows no conflicts message when empty', () => {
    renderWithProviders(
      <ConflictResolver conflicts={[]} onResolve={mockOnResolve} />
    );
    expect(screen.getByText('No Conflicts')).toBeInTheDocument();
    expect(screen.getByText('All your data is in sync')).toBeInTheDocument();
  });

  it('shows conflict count', () => {
    renderWithProviders(
      <ConflictResolver conflicts={mockConflicts} onResolve={mockOnResolve} />
    );
    expect(screen.getByText('2 conflicts to resolve')).toBeInTheDocument();
  });

  it('displays entity types in accordion', () => {
    renderWithProviders(
      <ConflictResolver conflicts={mockConflicts} onResolve={mockOnResolve} />
    );
    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
  });

  it('shows version numbers', () => {
    renderWithProviders(
      <ConflictResolver conflicts={mockConflicts} onResolve={mockOnResolve} />
    );
    expect(screen.getByText('v3 vs v4')).toBeInTheDocument();
    expect(screen.getByText('v2 vs v3')).toBeInTheDocument();
  });

  it('shows action required badge', () => {
    renderWithProviders(
      <ConflictResolver conflicts={mockConflicts} onResolve={mockOnResolve} />
    );
    expect(screen.getByText('Action Required')).toBeInTheDocument();
  });

  it('does not show resolved conflicts', () => {
    const resolvedConflict: SyncConflict = {
      ...mockConflicts[0],
      resolved_at: Date.now() / 1000,
      resolution: 'local',
    };
    renderWithProviders(
      <ConflictResolver conflicts={[resolvedConflict]} onResolve={mockOnResolve} />
    );
    expect(screen.getByText('No Conflicts')).toBeInTheDocument();
  });
});

