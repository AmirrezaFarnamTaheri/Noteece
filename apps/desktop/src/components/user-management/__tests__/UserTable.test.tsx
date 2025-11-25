import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { UserTable } from '../UserTable';
import { SpaceUser } from '../types';

const mockUsers: SpaceUser[] = [
  {
    user_id: 'user1',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    permissions: ['note.read', 'note.write'],
    last_active: Date.now() / 1000 - 3600,
    joined_at: Date.now() / 1000 - 86400 * 30,
  },
  {
    user_id: 'user2',
    email: 'editor@example.com',
    role: 'editor',
    status: 'active',
    permissions: ['note.read'],
    last_active: null,
    joined_at: Date.now() / 1000 - 86400 * 7,
  },
  {
    user_id: 'user3',
    email: 'suspended@example.com',
    role: 'viewer',
    status: 'suspended',
    permissions: [],
    last_active: Date.now() / 1000 - 86400 * 14,
    joined_at: Date.now() / 1000 - 86400 * 60,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('UserTable', () => {
  const mockOnEdit = jest.fn();
  const mockOnToggleStatus = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all users', () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
        onRemove={mockOnRemove}
      />
    );
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('editor@example.com')).toBeInTheDocument();
    expect(screen.getByText('suspended@example.com')).toBeInTheDocument();
  });

  it('displays role badges', () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
        onRemove={mockOnRemove}
      />
    );
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('displays status badges', () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
        onRemove={mockOnRemove}
      />
    );
    const activeStatuses = screen.getAllByText('active');
    expect(activeStatuses.length).toBe(2);
    expect(screen.getByText('suspended')).toBeInTheDocument();
  });

  it('shows Never for users with no last_active', () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
        onRemove={mockOnRemove}
      />
    );
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('shows empty message when no users', () => {
    renderWithProviders(
      <UserTable
        users={[]}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
        onRemove={mockOnRemove}
      />
    );
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('displays user avatars with first letter', () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
        onRemove={mockOnRemove}
      />
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
  });
});

