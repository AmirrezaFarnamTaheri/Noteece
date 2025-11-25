import React from 'react';
import {
  Card,
  Group,
  Stack,
  Text,
  Button,
  Badge,
  Code,
  Accordion,
} from '@mantine/core';
import {
  IconGitMerge,
  IconDeviceDesktop,
  IconCloud,
  IconCheck,
} from '@tabler/icons-react';
import { SyncConflict } from './types';

interface ConflictResolverProps {
  conflicts: SyncConflict[];
  onResolve: (conflictId: string, resolution: 'local' | 'remote' | 'merged') => void;
}

const formatEntityType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
};

/**
 * Conflict Resolver Component - Handle sync conflicts
 */
export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflicts,
  onResolve,
}) => {
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved_at);

  if (unresolvedConflicts.length === 0) {
    return (
      <Card withBorder p="lg">
        <Stack align="center" gap="md">
          <IconCheck size={48} color="green" />
          <Text fw={500}>No Conflicts</Text>
          <Text c="dimmed" size="sm">
            All your data is in sync
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={500}>
          {unresolvedConflicts.length} conflict{unresolvedConflicts.length !== 1 ? 's' : ''} to resolve
        </Text>
        <Badge color="red" variant="light">
          Action Required
        </Badge>
      </Group>

      <Accordion variant="separated">
        {unresolvedConflicts.map((conflict) => (
          <Accordion.Item key={conflict.id} value={conflict.id}>
            <Accordion.Control>
              <Group gap="sm">
                <IconGitMerge size={16} />
                <Text size="sm">
                  {formatEntityType(conflict.entity_type)}
                </Text>
                <Text size="xs" c="dimmed">
                  v{conflict.local_version} vs v{conflict.remote_version}
                </Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Code block>
                  {JSON.stringify(JSON.parse(conflict.conflict_data), null, 2)}
                </Code>

                <Group gap="sm">
                  <Button
                    variant="light"
                    leftSection={<IconDeviceDesktop size={14} />}
                    onClick={() => onResolve(conflict.id, 'local')}
                  >
                    Keep Local
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<IconCloud size={14} />}
                    onClick={() => onResolve(conflict.id, 'remote')}
                  >
                    Keep Remote
                  </Button>
                  <Button
                    variant="filled"
                    leftSection={<IconGitMerge size={14} />}
                    onClick={() => onResolve(conflict.id, 'merged')}
                  >
                    Merge
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
};

