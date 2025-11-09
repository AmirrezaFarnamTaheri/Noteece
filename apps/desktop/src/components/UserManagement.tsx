import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Table,
  Avatar,
  Modal,
  TextInput,
  Select,
  MultiSelect,
  Switch,
  ActionIcon,
  Menu,
  Tabs,
  Alert,
  ScrollArea,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconUsers,
  IconUserPlus,
  IconDots,
  IconEdit,
  IconTrash,
  IconShield,
  IconMail,
  IconKey,
  IconSettings,
  IconLock,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { EmptyState } from '@noteece/ui';
import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useStore } from '../store';
import { authService } from '../services/auth';

interface SpaceUser {
  user_id: string;
  email: string;
  role: string;
  status: 'active' | 'invited' | 'suspended';
  permissions: string[];
  last_active: number | null;
  joined_at: number;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

interface UserInvitation {
  id: string;
  space_id: string;
  email: string;
  role: string;
  permissions: string[];
  invited_by: string;
  invited_at: number;
  expires_at: number;
  status: string;
  token: string;
}

const roleColors: Record<string, string> = {
  owner: 'purple',
  admin: 'red',
  editor: 'blue',
  viewer: 'gray',
};

const statusColors: Record<string, string> = {
  active: 'green',
  invited: 'yellow',
  suspended: 'red',
};

/**
 * Get current user ID for audit logging
 * Returns null if user is not authenticated instead of throwing
 * The caller is responsible for handling the null case
 */
function getCurrentUserId(): string | null {
  return authService.getCurrentUserId();
}

/**
 * User Management Component - Manage users, roles, and permissions
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

  // Fetch users for the active space
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['spaceUsers', activeSpaceId],
    queryFn: async () => {
      // Guard against missing space ID to prevent backend errors
      if (!activeSpaceId) {
        return [];
      }
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

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated. Please log in first.');
      }

      // Invite user
      const invitation = await invoke<UserInvitation>('invite_user_cmd', {
        space_id: activeSpaceId,
        email: values.email,
        roleId: values.roleId,
        invitedBy: currentUserId,
      });

      // If custom permissions are specified, grant them
      if (values.customPermissions.length > 0) {
        // First, add the user to space (they'll be in 'invited' status)
        // Note: In a real app, this would happen when they accept the invitation
        // For now, we'll just store the custom permissions in the invitation
      }

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
        message: String(error),
        color: 'red',
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (values: { userId: string; roleId: string; customPermissions: string[] }) => {
      if (!activeSpaceId) throw new Error('No active space');

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated. Please log in first.');
      }

      // Update role
      await invoke('update_user_role_cmd', {
        space_id: activeSpaceId,
        userId: values.userId,
        newRoleId: values.roleId,
        updatedBy: currentUserId,
      });

      // Handle custom permissions
      // Get the role's default permissions
      const role = roles.find(r => r.id === values.roleId);
      const rolePermissions = role?.permissions || [];

      // Grant custom permissions not in the role
      const permissionsToGrant = values.customPermissions.filter(
        p => !rolePermissions.includes(p)
      );
      for (const permission of permissionsToGrant) {
        await invoke('grant_permission_cmd', {
          space_id: activeSpaceId,
          userId: values.userId,
          permission,
        });
      }

      // Revoke role permissions not in custom permissions
      const permissionsToRevoke = rolePermissions.filter(
        p => !values.customPermissions.includes(p)
      );
      for (const permission of permissionsToRevoke) {
        await invoke('revoke_permission_cmd', {
          space_id: activeSpaceId,
          userId: values.userId,
          permission,
        });
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
        message: String(error),
        color: 'red',
      });
    },
  });

  // Suspend/activate user mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async (values: { userId: string; currentStatus: string }) => {
      if (!activeSpaceId) throw new Error('No active space');

      if (values.currentStatus === 'suspended') {
        await invoke('activate_user_cmd', {
          space_id: activeSpaceId,
          userId: values.userId,
        });
      } else {
        await invoke('suspend_user_cmd', {
          space_id: activeSpaceId,
          userId: values.userId,
        });
      }
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

      await invoke('remove_user_from_space_cmd', {
        space_id: activeSpaceId,
        userId,
      });
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

  const inviteForm = useForm({
    initialValues: {
      email: '',
      roleId: 'viewer',
      customPermissions: [] as string[],
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const editForm = useForm({
    initialValues: {
      roleId: '',
      customPermissions: [] as string[],
    },
  });

  const handleInviteUser = (values: typeof inviteForm.values) => {
    inviteUserMutation.mutate(values);
  };

  const handleEditUser = (values: typeof editForm.values) => {
    if (!selectedUser) return;

    updateRoleMutation.mutate({
      userId: selectedUser.user_id,
      roleId: values.roleId,
      customPermissions: values.customPermissions,
    });
  };

  const handleSuspendUser = (userId: string, currentStatus: string) => {
    toggleUserStatusMutation.mutate({ userId, currentStatus });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      removeUserMutation.mutate(userId);
    }
  };

  const getRelativeTime = (timestamp: number | null): string => {
    if (!timestamp || timestamp === 0) return 'Never';
    const diff = Date.now() - timestamp * 1000; // Convert from seconds to milliseconds
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const allPermissions = [
    { value: 'read', label: 'Read' },
    { value: 'write', label: 'Write' },
    { value: 'delete', label: 'Delete' },
    { value: 'admin', label: 'Admin' },
    { value: 'manage_users', label: 'Manage Users' },
    { value: 'manage_billing', label: 'Manage Billing' },
  ];

  const activeUsers = users.filter((u) => u.status === 'active').length;
  const invitedUsers = users.filter((u) => u.status === 'invited').length;

  const isLoading = usersLoading || rolesLoading;

  if (!activeSpaceId) {
    return (
      <Stack gap="lg" p="lg">
        <Alert icon={<IconAlertCircle size={16} />} title="No Active Space" color="yellow">
          Please select a space to manage users
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" p="lg" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Group justify="space-between">
        <Group gap="sm">
          <Title order={2}>User Management</Title>
          <Badge size="lg" variant="light">
            {users.length} {users.length === 1 ? 'User' : 'Users'}
          </Badge>
        </Group>
        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={() => setInviteModalOpened(true)}
          aria-label="Invite user"
        >
          Invite User
        </Button>
      </Group>

      {/* Quick Stats */}
      <Group grow>
        <Card p="lg" radius="md" withBorder>
          <Group>
            <Avatar size={60} radius="md" color="green">
              <IconUsers size={30} />
            </Avatar>
            <Stack gap={4}>
              <Text size="xl" fw={700}>
                {activeUsers}
              </Text>
              <Text size="xs" c="dimmed">
                Active Users
              </Text>
            </Stack>
          </Group>
        </Card>

        <Card p="lg" radius="md" withBorder>
          <Group>
            <Avatar size={60} radius="md" color="yellow">
              <IconMail size={30} />
            </Avatar>
            <Stack gap={4}>
              <Text size="xl" fw={700}>
                {invitedUsers}
              </Text>
              <Text size="xs" c="dimmed">
                Pending Invites
              </Text>
            </Stack>
          </Group>
        </Card>

        <Card p="lg" radius="md" withBorder>
          <Group>
            <Avatar size={60} radius="md" color="blue">
              <IconShield size={30} />
            </Avatar>
            <Stack gap={4}>
              <Text size="xl" fw={700}>
                {roles.length}
              </Text>
              <Text size="xs" c="dimmed">
                Roles
              </Text>
            </Stack>
          </Group>
        </Card>
      </Group>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <Tabs.List>
          <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
            Users
          </Tabs.Tab>
          <Tabs.Tab value="roles" leftSection={<IconShield size={16} />}>
            Roles
          </Tabs.Tab>
          <Tabs.Tab value="permissions" leftSection={<IconLock size={16} />}>
            Permissions
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" pt="md">
          <Card p="lg" radius="md" withBorder>
            {users.length === 0 ? (
              <EmptyState
                title="No users yet"
                description="Invite users to collaborate in this space"
                icon={IconUsers}
              />
            ) : (
              <ScrollArea>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>User</Table.Th>
                      <Table.Th>Role</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Last Active</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {users.map((user) => (
                      <Table.Tr key={user.user_id}>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar color="blue" radius="xl">
                              {user.email
                                .split('@')[0]
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                            </Avatar>
                            <Stack gap={0}>
                              <Text size="sm" fw={500}>
                                {user.email.split('@')[0]}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {user.email}
                              </Text>
                            </Stack>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={roleColors[user.role] || 'gray'} size="sm">
                            {user.role}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={statusColors[user.status]} size="sm" variant="light">
                            {user.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {getRelativeTime(user.last_active)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Menu position="bottom-end" shadow="md">
                            <Menu.Target>
                              <ActionIcon variant="subtle" aria-label={`Actions for ${user.email}`}>
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconEdit size={14} />}
                                onClick={() => {
                                  setSelectedUser(user);
                                  editForm.setValues({
                                    roleId: user.role,
                                    customPermissions: user.permissions,
                                  });
                                  setEditModalOpened(true);
                                }}
                              >
                                Edit Role
                              </Menu.Item>
                              {user.role !== 'owner' && (
                                <>
                                  <Menu.Item
                                    leftSection={<IconShield size={14} />}
                                    onClick={() => handleSuspendUser(user.user_id, user.status)}
                                  >
                                    {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                  </Menu.Item>
                                  <Menu.Divider />
                                  <Menu.Item
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => handleDeleteUser(user.user_id)}
                                  >
                                    Remove User
                                  </Menu.Item>
                                </>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="roles" pt="md">
          <Stack gap="md">
            {roles.map((role) => {
              const userCount = users.filter(u => u.role === role.id).length;
              return (
                <Card key={role.id} p="lg" radius="md" withBorder>
                  <Group justify="space-between">
                    <Group>
                      <Avatar size={60} radius="md" color={roleColors[role.id] || 'gray'}>
                        <IconShield size={30} />
                      </Avatar>
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Text size="lg" fw={600}>
                            {role.name}
                          </Text>
                          <Badge size="sm" variant="light">
                            {userCount} {userCount === 1 ? 'user' : 'users'}
                          </Badge>
                          {role.is_system && (
                            <Badge size="sm" variant="dot" color="gray">
                              System
                            </Badge>
                          )}
                        </Group>
                        <Text size="sm" c="dimmed">
                          {role.description}
                        </Text>
                        <Group gap="xs" mt="xs">
                          {role.permissions.map((perm) => (
                            <Badge key={perm} size="xs" variant="dot">
                              {perm.replaceAll('_', ' ')}
                            </Badge>
                          ))}
                        </Group>
                      </Stack>
                    </Group>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="permissions" pt="md">
          <Card p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Alert icon={<IconAlertCircle size={16} />} title="Permission System" color="blue">
                Configure granular permissions for each role. Changes will apply to all users with that role.
              </Alert>

              <Stack gap="sm">
                {allPermissions.map((perm) => (
                  <Card key={perm.value} p="md" withBorder>
                    <Group justify="space-between">
                      <Stack gap={4}>
                        <Text size="sm" fw={500}>
                          {perm.label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {perm.value === 'read' && 'View notes and content'}
                          {perm.value === 'write' && 'Create and edit notes'}
                          {perm.value === 'delete' && 'Delete notes and content'}
                          {perm.value === 'admin' && 'Access admin features'}
                          {perm.value === 'manage_users' && 'Invite and manage users'}
                          {perm.value === 'manage_billing' && 'Manage subscription and billing'}
                        </Text>
                      </Stack>
                      <Badge size="lg" variant="light">
                        {roles.filter((r) => r.permissions.includes(perm.value)).length} roles
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Invite User Modal */}
      <Modal
        opened={inviteModalOpened}
        onClose={() => {
          setInviteModalOpened(false);
          inviteForm.reset();
        }}
        title="Invite User"
        size="md"
      >
        <form onSubmit={inviteForm.onSubmit(handleInviteUser)}>
          <Stack gap="md">
            <TextInput
              label="Email Address"
              placeholder="user@example.com"
              leftSection={<IconMail size={16} />}
              required
              {...inviteForm.getInputProps('email')}
            />
            <Select
              label="Role"
              description="Assign a role with predefined permissions"
              data={roles.map((r) => ({ value: r.id, label: r.name }))}
              {...inviteForm.getInputProps('roleId')}
            />
            <MultiSelect
              label="Custom Permissions (Optional)"
              description="Override role permissions with custom selection"
              data={allPermissions}
              {...inviteForm.getInputProps('customPermissions')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setInviteModalOpened(false);
                  inviteForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={inviteUserMutation.isPending}>
                Send Invite
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        size="md"
      >
        {selectedUser && (
          <form onSubmit={editForm.onSubmit(handleEditUser)}>
            <Stack gap="md">
              <Group>
                <Avatar color="blue" radius="xl" size="lg">
                  {selectedUser.email
                    .split('@')[0]
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </Avatar>
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {selectedUser.email.split('@')[0]}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {selectedUser.email}
                  </Text>
                </Stack>
              </Group>

              <Select
                label="Role"
                description="Change user's role"
                data={roles.map((r) => ({ value: r.id, label: r.name }))}
                {...editForm.getInputProps('roleId')}
              />
              <MultiSelect
                label="Custom Permissions"
                description="Override role permissions"
                data={allPermissions}
                {...editForm.getInputProps('customPermissions')}
              />
              <Group justify="flex-end" mt="md">
                <Button
                  variant="default"
                  onClick={() => {
                    setEditModalOpened(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={updateRoleMutation.isPending}>
                  Save Changes
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Stack>
  );
};

export default UserManagement;
