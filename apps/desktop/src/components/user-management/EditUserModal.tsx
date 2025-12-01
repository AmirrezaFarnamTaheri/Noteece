import React, { useEffect } from 'react';
import { Modal, Select, Checkbox, Stack, Group, Button, Text, Avatar, Badge } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShield } from '@tabler/icons-react';
import { SpaceUser, Role, allPermissions, roleColors, statusColors } from './types';

interface EditUserModalProps {
  opened: boolean;
  onClose: () => void;
  user: SpaceUser | null;
  roles: Role[];
  isLoading: boolean;
  onSubmit: (values: { userId: string; roleId: string; customPermissions: string[] }) => void;
}

/**
 * Modal for editing user role and permissions
 */
export const EditUserModal: React.FC<EditUserModalProps> = ({ opened, onClose, user, roles, isLoading, onSubmit }) => {
  const form = useForm({
    initialValues: {
      roleId: '',
      customPermissions: [] as string[],
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      const userRole = roles.find((r) => r.name === user.role);
      const rolePermissions = userRole?.permissions || [];
      const customPermissions = user.permissions.filter((p) => !rolePermissions.includes(p));

      form.setValues({
        roleId: userRole?.id || '',
        customPermissions,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roles]);

  if (!user) return null;

  const selectedRole = roles.find((r) => r.id === form.values.roleId);
  const rolePermissions = selectedRole?.permissions || [];

  // Get permissions not included in the selected role
  const additionalPermissions = allPermissions.filter((p) => !rolePermissions.includes(p));

  const handleSubmit = (values: typeof form.values) => {
    onSubmit({
      userId: user.user_id,
      roleId: values.roleId,
      customPermissions: values.customPermissions,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit User" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* User Info */}
          <Group>
            <Avatar radius="xl" size="lg">
              {user.email.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text fw={500}>{user.email}</Text>
              <Group gap="xs">
                <Badge color={roleColors[user.role]} variant="light" size="sm">
                  {user.role}
                </Badge>
                <Badge color={statusColors[user.status]} variant="dot" size="sm">
                  {user.status}
                </Badge>
              </Group>
            </div>
          </Group>

          <Select
            label="Role"
            placeholder="Select a role"
            leftSection={<IconShield size={16} />}
            data={roles.map((r) => ({
              value: r.id,
              label: r.name,
              disabled: r.name === 'owner',
            }))}
            {...form.getInputProps('roleId')}
          />

          {selectedRole && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Role Permissions
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                {rolePermissions.join(', ') || 'No permissions'}
              </Text>
            </div>
          )}

          {additionalPermissions.length > 0 && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Additional Permissions
              </Text>
              <Stack gap="xs">
                {additionalPermissions.map((permission) => (
                  <Checkbox
                    key={permission}
                    label={permission}
                    checked={form.values.customPermissions.includes(permission)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        form.setFieldValue('customPermissions', [...form.values.customPermissions, permission]);
                      } else {
                        form.setFieldValue(
                          'customPermissions',
                          form.values.customPermissions.filter((p) => p !== permission),
                        );
                      }
                    }}
                  />
                ))}
              </Stack>
            </div>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
