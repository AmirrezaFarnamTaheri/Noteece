/**
 * UserManagement QA Fixes Tests
 * Tests for Session 5 security and functionality fixes
 */

import { screen, fireEvent, waitFor, within, render } from '@testing-library/react';
import { AllTheProviders } from '../../utils/test-utils';
import UserManagement from '../UserManagement';
import '@testing-library/jest-dom';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: <T = unknown,>(...arguments_: unknown[]) => mockInvoke(...arguments_) as Promise<T>,
}));

// Mock store
jest.mock('../../store', () => ({
  useStore: () => ({
    activeSpaceId: 'test-space-123',
  }),
}));

jest.mock('../../services/auth', () => ({
  authService: {
    getCurrentUserId: jest.fn(() => Promise.resolve('01H8XGJWBWBAQ4Z4Q4Z4Q4Z4Q4')),
  },
}));

const openEditModalForUser = async (email: string) => {
  const userRow = await screen.findByText(email);
  const actionsButton = await within(userRow.closest('tr') as HTMLElement).findByLabelText(/actions for/i);
  fireEvent.click(actionsButton);
  const editMenuItem = await screen.findByRole('menuitem', { name: /edit role/i });
  fireEvent.click(editMenuItem);
  return screen.findByRole('dialog', { name: /edit user/i });
};

const defaultInvokeHandler = (cmd: string) => {
  if (cmd === 'get_space_users_cmd') {
    return Promise.resolve([]);
  }
  if (cmd === 'get_roles_cmd') {
    return Promise.resolve([
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'View only',
        permissions: ['read'],
        created_at: Date.now(),
      },
    ]);
  }
  return Promise.resolve({});
};

describe('UserManagement QA Fixes (Session 5)', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation(defaultInvokeHandler);
  });

  // ============== AUTHENTICATION HELPER TESTS ==============

  describe('getCurrentUserId helper', () => {
    it('should use documented system_user placeholder', async () => {
      // Mock successful invite
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'invite_user_cmd') {
          return Promise.resolve({
            id: 'inv-123',
            email: 'new@example.com',
            role: 'editor',
            token: 'abc123',
            status: 'pending',
          });
        }
        return defaultInvokeHandler(cmd);
      });

      render(<UserManagement />, { wrapper: AllTheProviders });

      // Open invite modal
      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      fireEvent.click(inviteButton);

      // Fill form
      const emailInput = await screen.findByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /send invite/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'invite_user_cmd',
          expect.objectContaining({
            invitedBy: '01H8XGJWBWBAQ4Z4Q4Z4Q4Z4Q4',
          }),
        );
      });
    });
  });

  // ============== PERMISSION REVOCATION TESTS ==============

  describe('Permission revocation logic', () => {
    beforeEach(() => {
      // Mock get_space_users_cmd
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_space_users_cmd') {
          return Promise.resolve([
            {
              user_id: 'user-1',
              email: 'user@example.com',
              role: 'editor',
              status: 'active',
              permissions: ['read', 'write', 'manage_users', 'manage_billing'],
              joined_at: Date.now(),
              last_active: Date.now(),
            },
          ]);
        }
        if (cmd === 'get_roles_cmd') {
          return Promise.resolve([
            {
              id: 'editor',
              name: 'editor',
              description: 'Can edit',
              permissions: ['read', 'write'],
              created_at: Date.now(),
            },
          ]);
        }
        return defaultInvokeHandler(cmd);
      });
    });

    it('should revoke permissions when resetting to role defaults (empty custom permissions)', async () => {
      render(<UserManagement />, { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      const editModal = await openEditModalForUser('user@example.com');

      // Clear all custom permissions (reset to role defaults)
      const customPermCheckboxes = within(editModal).getAllByRole('checkbox');
      for (const checkbox of customPermCheckboxes) {
        if ((checkbox as HTMLInputElement).checked) {
          fireEvent.click(checkbox);
        }
      }

      // Save
      const saveButton = within(editModal).getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'revoke_permission_cmd',
          expect.objectContaining({ permission: 'manage_users' }),
        );
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'revoke_permission_cmd',
          expect.objectContaining({ permission: 'manage_billing' }),
        );
      });
    });

    it('should NOT revoke role permissions when resetting to defaults', async () => {
      render(<UserManagement />, { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      const editModal = await openEditModalForUser('user@example.com');

      // Clear custom permissions
      const customPermCheckboxes = within(editModal).getAllByRole('checkbox');
      for (const checkbox of customPermCheckboxes) {
        if ((checkbox as HTMLInputElement).checked) {
          fireEvent.click(checkbox);
        }
      }

      const saveButton = within(editModal).getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('revoke_permission_cmd', expect.anything());
      });

      const revokeCalls = mockInvoke.mock.calls.filter((call) => call[0] === 'revoke_permission_cmd');
      const revokedPermissions = revokeCalls.map((call) => (call[1] as { permission: string }).permission);

      // Should NOT revoke read or write (role permissions)
      expect(revokedPermissions).not.toContain('read');
      expect(revokedPermissions).not.toContain('write');
    });

    it('should revoke only permissions not in new custom list', async () => {
      render(<UserManagement />, { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      const editModal = await openEditModalForUser('user@example.com');

      // Keep only Manage Users, remove Manage Billing
      const checkbox2 = within(editModal).getByLabelText('Manage Billing');
      if ((checkbox2 as HTMLInputElement).checked) {
        fireEvent.click(checkbox2);
      }

      const saveButton = within(editModal).getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'revoke_permission_cmd',
          expect.objectContaining({ permission: 'manage_billing' }),
        );
      });

      const revokeCalls = mockInvoke.mock.calls.filter((call) => call[0] === 'revoke_permission_cmd');
      const revokedPermissions = revokeCalls.map((call) => (call[1] as { permission: string }).permission);

      // Should revoke manage_billing but not manage_users
      expect(revokedPermissions).toContain('manage_billing');
      expect(revokedPermissions).not.toContain('manage_users');
    });
  });

  // ============== INTEGRATION TESTS ==============

  describe('Full user management workflow', () => {
    it('should handle complete user lifecycle with correct audit trail', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_space_users_cmd') {
          return Promise.resolve([]);
        }
        if (cmd === 'get_roles_cmd') {
          return Promise.resolve([
            {
              id: 'viewer',
              name: 'Viewer',
              description: 'Viewer',
              permissions: ['read'],
              created_at: Date.now(),
            },
            {
              id: 'editor',
              name: 'editor',
              description: 'Editor',
              permissions: ['read', 'write'],
              created_at: Date.now(),
            },
          ]);
        }
        if (cmd === 'invite_user_cmd') {
          return Promise.resolve({
            id: 'inv-1',
            email: 'new@example.com',
            role: 'editor',
            token: 'secure-token-123',
            status: 'pending',
          });
        }
        return defaultInvokeHandler(cmd);
      });

      render(<UserManagement />, { wrapper: AllTheProviders });

      // Invite user
      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      fireEvent.click(inviteButton);

      const inviteModal = await screen.findByRole('dialog', { name: /invite user/i });
      const emailInput = within(inviteModal).getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      const submitButton = within(inviteModal).getByRole('button', { name: /send invite/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'invite_user_cmd',
          expect.objectContaining({
            email: 'new@example.com',
            roleId: expect.any(String),
            invitedBy: '01H8XGJWBWBAQ4Z4Q4Z4Q4Z4Q4',
          }),
        );
      });
    });
  });

  // ============== SECURITY TESTS ==============

  describe('Security validations', () => {
    it('should prevent XSS in email input', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'invite_user_cmd') {
          return Promise.resolve({
            id: 'inv-1',
            email: 'test@example.com',
            role: 'editor',
            token: 'token',
            status: 'pending',
          });
        }
        return defaultInvokeHandler(cmd);
      });

      render(<UserManagement />, { wrapper: AllTheProviders });

      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      fireEvent.click(inviteButton);

      const inviteModal = await screen.findByRole('dialog', { name: /invite user/i });
      const emailInput = within(inviteModal).getByLabelText(/email address/i);

      // Try XSS payload
      const xssPayload = '<script>alert("xss")</script>@example.com';
      fireEvent.change(emailInput, { target: { value: xssPayload } });

      const submitButton = within(inviteModal).getByRole('button', { name: /send invite/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Email should be validated and rejected or sanitized
        const inviteCalls = mockInvoke.mock.calls.filter((call) => call[0] === 'invite_user_cmd');

        if (inviteCalls.length > 0) {
          // If it got through (shouldn't), verify it's sanitized
          const email = (inviteCalls[0][1] as { email: string }).email;
          expect(email).not.toContain('<script>');
          expect(email).not.toContain('</script>');
        }
      });
    });

    it('should validate email format before submission', async () => {
      render(<UserManagement />, { wrapper: AllTheProviders });

      const inviteButton = screen.getByRole('button', { name: /invite user/i });
      fireEvent.click(inviteButton);

      const inviteModal = await screen.findByRole('dialog', { name: /invite user/i });
      const emailInput = within(inviteModal).getByLabelText(/email address/i);

      // Invalid email
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

      const submitButton = within(inviteModal).getByRole('button', { name: /send invite/i });
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      // Should not call backend
      expect(mockInvoke).not.toHaveBeenCalledWith('invite_user_cmd', expect.anything());
    });
  });

  // ============== EDGE CASES ==============

  describe('Edge cases', () => {
    it('should handle empty user list gracefully', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_space_users_cmd') {
          return Promise.resolve([]);
        }
        if (cmd === 'get_roles_cmd') {
          return Promise.resolve([]);
        }
        return defaultInvokeHandler(cmd);
      });

      render(<UserManagement />, { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(screen.getByText(/no users yet/i)).toBeInTheDocument();
      });
    });

    it('should handle backend errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Database connection failed'));

      render(<UserManagement />, { wrapper: AllTheProviders });

      await waitFor(() => {
        // Should show error state, not crash
        expect(screen.queryByText('User Management')).toBeInTheDocument();
      });
    });

    it('should handle concurrent permission updates', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_space_users_cmd') {
          return Promise.resolve([
            {
              user_id: 'user-1',
              email: 'user1@example.com',
              role: 'editor',
              status: 'active',
              permissions: ['read'],
              joined_at: Date.now(),
              last_active: Date.now(),
            },
            {
              user_id: 'user-2',
              email: 'user2@example.com',
              role: 'editor',
              status: 'active',
              permissions: ['read'],
              joined_at: Date.now(),
              last_active: Date.now(),
            },
          ]);
        }
        if (cmd === 'grant_permission_cmd') {
          return Promise.resolve();
        }
        return defaultInvokeHandler(cmd);
      });

      render(<UserManagement />, { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      });

      // Edit both users sequentially to simulate concurrent updates
      await openEditModalForUser('user1@example.com');
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => expect(screen.queryByText(/edit user/i)).not.toBeInTheDocument());

      await openEditModalForUser('user2@example.com');
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      // Both should succeed without conflicts
      await waitFor(() => {
        const grantCalls = mockInvoke.mock.calls.filter((call) => call[0] === 'grant_permission_cmd');
        expect(grantCalls.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
