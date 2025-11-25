import React from 'react';
import { Table, Avatar, Badge, Group, Text, ActionIcon, Menu } from '@mantine/core';
import { IconDots, IconEdit, IconTrash, IconLock } from '@tabler/icons-react';
import { SpaceUser, roleColors, statusColors } from './types';

interface UserTableProps {
  users: SpaceUser[];
  onEdit: (user: SpaceUser) => void;
  onToggleStatus: (userId: string, currentStatus: string) => void;
  onRemove: (userId: string) => void;
}

/**
 * User Table Component - Displays list of users with actions
 */
export const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onToggleStatus, onRemove }) => {
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (users.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No users found
      </Text>
    );
  }

  const rows = users.map((user) => (
    <Table.Tr key={user.user_id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar radius="xl" size="md">
            {user.email.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text size="sm" fw={500}>
              {user.email}
            </Text>
            <Text size="xs" c="dimmed">
              ID: {user.user_id.slice(0, 8)}...
            </Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={roleColors[user.role] || 'gray'} variant="light">
          {user.role}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge color={statusColors[user.status]} variant="dot">
          {user.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDate(user.last_active)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDate(user.joined_at)}</Text>
      </Table.Td>
      <Table.Td>
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(user)}>
              Edit Role
            </Menu.Item>
            <Menu.Item leftSection={<IconLock size={14} />} onClick={() => onToggleStatus(user.user_id, user.status)}>
              {user.status === 'suspended' ? 'Activate' : 'Suspend'}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onRemove(user.user_id)}>
              Remove
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>User</Table.Th>
          <Table.Th>Role</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Last Active</Table.Th>
          <Table.Th>Joined</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
