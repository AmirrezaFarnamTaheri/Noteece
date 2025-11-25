import React, { useState } from 'react';
import { Card, Title, Text, Group, Stack, Button, Tabs, Alert, ScrollArea, LoadingOverlay } from '@mantine/core';
import { IconUsers, IconUserPlus, IconShield, IconSettings, IconAlertCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { EmptyState } from '@noteece/ui';
import { invoke } from '@tauri-apps/api/tauri';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useStore } from '../../store';
import { authService } from '../../services/auth';
import { logger } from '@/utils/logger';
import { SpaceUser, Role, UserInvitation } from './types';
import { UserTable } from './UserTable';
import { InviteUserModal } from './InviteUserModal';
import { EditUserModal } from './EditUserModal';

/**
 * User Management Component - Refactored into smaller sub-components
 *
 * Features:
 * - User listing with roles and status
 * - Invite new users
 * - Edit user roles and permissions
 * - Role-based access control (RBAC)
 * - Permission management
 * - User activity tracking
 * - Suspend/activate users
 */
const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeSpaceId } = useStore();

  const [inviteModalOpened, setInviteModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SpaceUser | null>(null);

  // Forms
  const inviteForm = useForm({
    initialValues: {
      email: '',
      roleId: '',
      customPermissions: [] as string[],
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      roleId: (value) => (value ? null : 'Role is required'),
    },
  });

  // Fetch users for the active space
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['spaceUsers', activeSpaceId],
    queryFn: async () => {
      if (!activeSpaceId) return [];
      return await invoke<SpaceUser[]>('get_space_users_cmd', { space_id: activeSpaceId });
    },
    enabled: !!activeSpaceId,
  });

  // Fetch available roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => invoke<Role[]>('get_roles_cmd'),
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (values: { email: string; roleId: string; customPermissions: string[] }) => {
      if (!activeSpaceId) throw new Error('No active space');
      const currentUserId = await authService.getCurrentUserId();
      if (!currentUserId) throw new Error('Could not retrieve user ID.');

      const invitation = await invoke<UserInvitation>('invite_user_cmd', {
        space_id: activeSpaceId,
        email: values.email,
        roleId: values.roleId,
        invitedBy: currentUserId,
      });
      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaceUsers', activeSpaceId] });
      notifications.show({
        title: 'User invited',
        message: 'Invitation sent successfully',
        color: 'green',
      });
      setInviteModalOpened(false);
      inviteForm.reset();
    },
    onError: (error) => {
      notifications.show({
        title: 'Failed to invite user',
        message: 'Could not send invitation. Please try again.',
        color: 'red',
      });
      logger.error('Invite error:', error);
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (values: { userId: string; roleId: string; customPermissions: string[] }) => {
      if (!activeSpaceId) throw new Error('No active space');
      const currentUserId = await authService.getCurrentUserId();
      if (!currentUserId) throw new Error('Could not retrieve user ID.');
      if (values.userId === currentUserId) {
        throw new Error('You cannot modify your own role.');
      }

      await invoke('update_user_role_cmd', {
        space_id: activeSpaceId,
        userId: values.userId,
        newRoleId: values.roleId,
        updatedBy: currentUserId,
      });

      // Handle custom permissions
      const role = roles.find((r) => r.id === values.roleId);
      const rolePermissions = role?.permissions || [];
      const currentPermissions = selectedUser?.permissions || [];
      const currentCustomPermissions = currentPermissions.filter((p) => !rolePermissions.includes(p));

      // Grant new permissions
      for (const permission of values.customPermissions) {
        if (!currentCustomPermissions.includes(permission)) {
          await invoke('grant_permission_cmd', {
            space_id: activeSpaceId,
            userId: values.userId,
            permission,
          });
        }
      }

      // Revoke removed permissions
      for (const permission of currentCustomPermissions) {
        if (!values.customPermissions.includes(permission)) {
          await invoke('revoke_permission_cmd', {
            space_id: activeSpaceId,
            userId: values.userId,
            permission,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaceUsers', activeSpaceId] });
      notifications.show({
        title: 'User updated',
        message: 'User role and permissions updated successfully',
        color: 'green',
      });
      setEditModalOpened(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      notifications.show({
        title: 'Failed to update user',
        message: 'Could not update user role.',
        color: 'red',
      });
      logger.error('Update role error:', error);
    },
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async (values: { userId: string; currentStatus: string }) => {
      if (!activeSpaceId) throw new Error('No active space');
      const cmd = values.currentStatus === 'suspended' ? 'activate_user_cmd' : 'suspend_user_cmd';
      await invoke(cmd, { space_id: activeSpaceId, userId: values.userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaceUsers', activeSpaceId] });
      notifications.show({
        title: 'User status updated',
        message: 'User status changed successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Failed to update status',
        message: String(error),
        color: 'red',
      });
    },
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!activeSpaceId) throw new Error('No active space');
      await invoke('remove_user_from_space_cmd', { space_id: activeSpaceId, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaceUsers', activeSpaceId] });
      notifications.show({
        title: 'User removed',
        message: 'User removed from space successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Failed to remove user',
        message: String(error),
        color: 'red',
      });
    },
  });

  // Handlers
  const handleEdit = (user: SpaceUser) => {
    setSelectedUser(user);
    setEditModalOpened(true);
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    toggleUserStatusMutation.mutate({ userId, currentStatus });
  };

  const handleRemove = (userId: string) => {
    removeUserMutation.mutate(userId);
  };

  const isLoading = usersLoading || rolesLoading;

  if (!activeSpaceId) {
    return (
      <Card withBorder p="xl">
        <EmptyState
          icon={<IconAlertCircle size={48} />}
          title="No Space Selected"
          description="Please select or create a space to manage users."
        />
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>User Management</Title>
          <Text c="dimmed" size="sm">
            Manage users, roles, and permissions for this space
          </Text>
        </div>
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setInviteModalOpened(true)}>
          Invite User
        </Button>
      </Group>

      <Card withBorder pos="relative">
        <LoadingOverlay visible={isLoading} />

        <Tabs defaultValue="users">
          <Tabs.List>
            <Tabs.Tab value="users" leftSection={<IconUsers size={14} />}>
              Users ({users.length})
            </Tabs.Tab>
            <Tabs.Tab value="roles" leftSection={<IconShield size={14} />}>
              Roles ({roles.length})
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={14} />}>
              Settings
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="users" pt="md">
            <ScrollArea>
              <UserTable
                users={users}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onRemove={handleRemove}
              />
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="roles" pt="md">
            <Stack gap="md">
              {roles.map((role) => (
                <Card key={role.id} withBorder p="sm">
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{role.name}</Text>
                    {role.is_system && (
                      <Text size="xs" c="dimmed">
                        System Role
                      </Text>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed" mb="xs">
                    {role.description}
                  </Text>
                  <Text size="xs">Permissions: {role.permissions.join(', ') || 'None'}</Text>
                </Card>
              ))}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="md">
            <Alert icon={<IconAlertCircle size={16} />}>
              Space settings and access controls can be configured here.
            </Alert>
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Modals */}
      <InviteUserModal
        opened={inviteModalOpened}
        onClose={() => setInviteModalOpened(false)}
        form={inviteForm}
        roles={roles}
        isLoading={inviteUserMutation.isPending}
        onSubmit={(values) => inviteUserMutation.mutate(values)}
      />

      <EditUserModal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        roles={roles}
        isLoading={updateRoleMutation.isPending}
        onSubmit={(values) => updateRoleMutation.mutate(values)}
      />
    </Stack>
  );
};

export default UserManagement;
