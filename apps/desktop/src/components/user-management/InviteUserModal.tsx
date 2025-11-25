import React from 'react';
import {
  Modal,
  TextInput,
  Select,
  Checkbox,
  Stack,
  Group,
  Button,
  Text,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconMail, IconShield } from '@tabler/icons-react';
import { Role, allPermissions } from './types';

interface InviteFormValues {
  email: string;
  roleId: string;
  customPermissions: string[];
}

interface InviteUserModalProps {
  opened: boolean;
  onClose: () => void;
  form: UseFormReturnType<InviteFormValues>;
  roles: Role[];
  isLoading: boolean;
  onSubmit: (values: InviteFormValues) => void;
}

/**
 * Modal for inviting new users to a space
 */
export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  opened,
  onClose,
  form,
  roles,
  isLoading,
  onSubmit,
}) => {
  const selectedRole = roles.find((r) => r.id === form.values.roleId);
  const rolePermissions = selectedRole?.permissions || [];

  // Get permissions not included in the selected role
  const additionalPermissions = allPermissions.filter(
    (p) => !rolePermissions.includes(p)
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Invite User" size="md">
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Email Address"
            placeholder="user@example.com"
            leftSection={<IconMail size={16} />}
            {...form.getInputProps('email')}
          />

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
                        form.setFieldValue('customPermissions', [
                          ...form.values.customPermissions,
                          permission,
                        ]);
                      } else {
                        form.setFieldValue(
                          'customPermissions',
                          form.values.customPermissions.filter(
                            (p) => p !== permission
                          )
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
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

