import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import UserManagement from '../UserManagement';
import '@testing-library/jest-dom';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('UserManagement', () => {
  it('renders user management page', () => {
    renderWithProviders(<UserManagement />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('displays user count badge', () => {
    renderWithProviders(<UserManagement />);
    expect(screen.getByText('4 Users')).toBeInTheDocument();
  });

  it('shows invite user button', () => {
    renderWithProviders(<UserManagement />);
    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
  });

  it('displays quick stats cards', () => {
    renderWithProviders(<UserManagement />);
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Pending Invites')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });

  it('shows three tabs', () => {
    renderWithProviders(<UserManagement />);
    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /roles/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument();
  });

  it('displays user table with mock users', () => {
    renderWithProviders(<UserManagement />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('Alice Williams')).toBeInTheDocument();
  });

  it('opens invite modal when invite button clicked', () => {
    renderWithProviders(<UserManagement />);
    const inviteButton = screen.getByRole('button', { name: /invite user/i });

    fireEvent.click(inviteButton);

    expect(screen.getByText('Invite User')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('displays role badges for users', () => {
    renderWithProviders(<UserManagement />);
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('shows roles panel when roles tab clicked', () => {
    renderWithProviders(<UserManagement />);
    const rolesTab = screen.getByRole('tab', { name: /roles/i });

    fireEvent.click(rolesTab);

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });
});
