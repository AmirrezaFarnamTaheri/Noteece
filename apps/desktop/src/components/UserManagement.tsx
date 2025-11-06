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

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  avatarUrl?: string;
  joinedAt: number;
  lastActive: number;
  permissions: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
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
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      status: 'active',
      joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      lastActive: Date.now() - 5 * 60 * 1000,
      permissions: ['read', 'write', 'delete', 'admin', 'manage_users'],
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      lastActive: Date.now() - 2 * 60 * 60 * 1000,
      permissions: ['read', 'write', 'delete', 'manage_users'],
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'editor',
      status: 'active',
      joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      lastActive: Date.now() - 1 * 24 * 60 * 60 * 1000,
      permissions: ['read', 'write'],
    },
    {
      id: '4',
      name: 'Alice Williams',
      email: 'alice@example.com',
      role: 'viewer',
      status: 'invited',
      joinedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      lastActive: 0,
      permissions: ['read'],
    },
  ]);

  const [roles] = useState<Role[]>([
    {
      id: 'owner',
      name: 'Owner',
      description: 'Full access to all features and settings',
      permissions: ['read', 'write', 'delete', 'admin', 'manage_users', 'manage_billing'],
      userCount: 1,
    },
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Can manage users and content',
      permissions: ['read', 'write', 'delete', 'manage_users'],
      userCount: 1,
    },
    {
      id: 'editor',
      name: 'Editor',
      description: 'Can create and edit content',
      permissions: ['read', 'write'],
      userCount: 1,
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: ['read'],
      userCount: 1,
    },
  ]);

  const [inviteModalOpened, setInviteModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const inviteForm = useForm({
    initialValues: {
      email: '',
      role: 'viewer',
      customPermissions: [] as string[],
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const editForm = useForm({
    initialValues: {
      role: '',
      customPermissions: [] as string[],
    },
  });

  const handleInviteUser = (values: typeof inviteForm.values) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name: values.email.split('@')[0],
      email: values.email,
      role: values.role as User['role'],
      status: 'invited',
      joinedAt: Date.now(),
      lastActive: 0,
      permissions:
        values.customPermissions.length > 0
          ? values.customPermissions
          : roles.find((r) => r.id === values.role)?.permissions || [],
    };

    setUsers([...users, newUser]);
    inviteForm.reset();
    setInviteModalOpened(false);
  };

  const handleEditUser = (values: typeof editForm.values) => {
    if (!selectedUser || selectedUser.role === 'owner') return;

    setUsers(
      users.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              role: values.role as User['role'],
              permissions:
                values.customPermissions.length > 0
                  ? values.customPermissions
                  : roles.find((r) => r.id === values.role)?.permissions || [],
            }
          : user,
      ),
    );

    setEditModalOpened(false);
    setSelectedUser(null);
  };

  const handleSuspendUser = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, status: user.status === 'suspended' ? 'active' : 'suspended' } : user,
      ),
    );
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      setUsers(users.filter((user) => user.id !== userId));
    }
  };

  const getRelativeTime = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';
    const diff = Date.now() - timestamp;
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

  return (
    <Stack gap="lg" p="lg">
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
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar color="blue" radius="xl">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </Avatar>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {user.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {user.email}
                            </Text>
                          </Stack>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={roleColors[user.role]} size="sm">
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
                          {getRelativeTime(user.lastActive)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Menu position="bottom-end" shadow="md">
                          <Menu.Target>
                            <ActionIcon variant="subtle" aria-label={`Actions for ${user.name}`}>
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEdit size={14} />}
                              onClick={() => {
                                setSelectedUser(user);
                                editForm.setValues({
                                  role: user.role,
                                  customPermissions: user.permissions,
                                });
                                setEditModalOpened(true);
                              }}
                            >
                              Edit Role
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconKey size={14} />}
                              onClick={() => console.log('Reset password for', user.id)}
                            >
                              Reset Password
                            </Menu.Item>
                            {user.role !== 'owner' && (
                              <>
                                <Menu.Item
                                  leftSection={<IconShield size={14} />}
                                  onClick={() => handleSuspendUser(user.id)}
                                >
                                  {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => handleDeleteUser(user.id)}
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
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="roles" pt="md">
          <Stack gap="md">
            {roles.map((role) => (
              <Card key={role.id} p="lg" radius="md" withBorder>
                <Group justify="space-between">
                  <Group>
                    <Avatar size={60} radius="md" color={roleColors[role.id]}>
                      <IconShield size={30} />
                    </Avatar>
                    <Stack gap={4}>
                      <Group gap="xs">
                        <Text size="lg" fw={600}>
                          {role.name}
                        </Text>
                        <Badge size="sm" variant="light">
                          {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                        </Badge>
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
                  {role.id !== 'owner' && (
                    <Button size="xs" variant="light" leftSection={<IconSettings size={14} />}>
                      Configure
                    </Button>
                  )}
                </Group>
              </Card>
            ))}
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
              {...inviteForm.getInputProps('role')}
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
              <Button type="submit">Send Invite</Button>
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
                  {selectedUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </Avatar>
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {selectedUser.name}
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
                {...editForm.getInputProps('role')}
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
                <Button type="submit">Save Changes</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Stack>
  );
};

export default UserManagement;
