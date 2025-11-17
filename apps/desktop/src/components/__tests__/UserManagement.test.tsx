import { screen, fireEvent, waitFor, render } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/tauri';
import { AllTheProviders } from '../../utils/test-utils';
import UserManagement from '../UserManagement';
import '@testing-library/jest-dom';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

jest.mock('../../store', () => ({
  useStore: () => ({
    activeSpaceId: 'test-space-123',
  }),
}));

jest.mock('../../services/auth', () => ({
  authService: {
    getCurrentUserId: jest.fn(() => 'system_user'),
  },
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

const sampleUsers = [
  {
    user_id: '1',
    email: 'john@example.com',
    role: 'owner',
    status: 'active',
    permissions: ['read', 'write'],
    last_active: Math.floor(Date.now() / 1000),
    joined_at: Math.floor(Date.now() / 1000),
  },
  {
    user_id: '2',
    email: 'jane@example.com',
    role: 'admin',
    status: 'invited',
    permissions: ['read', 'write'],
    last_active: Math.floor(Date.now() / 1000),
    joined_at: Math.floor(Date.now() / 1000),
  },
];

const sampleRoles = [
  { id: 'owner', name: 'Owner', description: 'Full access', permissions: ['read', 'write'], created_at: Date.now() },
  { id: 'admin', name: 'Administrator', description: 'Admin access', permissions: ['read', 'write'], created_at: Date.now() },
  { id: 'editor', name: 'Editor', description: 'Edit content', permissions: ['read', 'write'], created_at: Date.now() },
  { id: 'viewer', name: 'Viewer', description: 'View only', permissions: ['read'], created_at: Date.now() },
];


describe('UserManagement', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_space_users_cmd') {
        return Promise.resolve(sampleUsers);
      }
      if (cmd === 'get_roles_cmd') {
        return Promise.resolve(sampleRoles);
      }
      if (cmd === 'get_space_invitations_cmd') {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });
  });

  it('renders user management page', () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('displays user count badge', async () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    await waitFor(() => {
      expect(screen.getByText('2 Users')).toBeInTheDocument();
    });
  });

  it('shows invite user button', () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
  });

  it('displays quick stats cards', async () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    expect(await screen.findByText('Active Users', { selector: 'p' })).toBeInTheDocument();
    expect(await screen.findByText('Pending Invites', { selector: 'p' })).toBeInTheDocument();
    const [rolesCardLabel] = await screen.findAllByText('Roles', { selector: 'p' });
    expect(rolesCardLabel).toBeInTheDocument();
  });

  it('shows three tabs', () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /roles/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument();
  });

  it('displays user table with mock users', async () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('opens invite modal when invite button clicked', async () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    const inviteButton = screen.getByRole('button', { name: /invite user/i });

    fireEvent.click(inviteButton);

    expect(screen.getByText('Invite User')).toBeInTheDocument();
    expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('displays role badges for users', async () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    const ownerRow = await screen.findByText('john@example.com');
    const adminRow = await screen.findByText('jane@example.com');
    expect(ownerRow.closest('tr')).toHaveTextContent(/owner/i);
    expect(adminRow.closest('tr')).toHaveTextContent(/admin/i);
  });

  it('shows roles panel when roles tab clicked', async () => {
    render(<UserManagement />, { wrapper: AllTheProviders });
    const rolesTab = screen.getByRole('tab', { name: /roles/i });

    fireEvent.click(rolesTab);

    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });
  });
});
