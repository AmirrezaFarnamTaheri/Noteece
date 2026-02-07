import React from 'react';
import { Card, Group, Stack, Text, Button, Badge, Accordion, Grid, Paper, Divider } from '@mantine/core';
import { IconGitMerge, IconDeviceDesktop, IconCloud, IconCheck, IconArrowRight } from '@tabler/icons-react';
import { SyncConflict } from './types';

interface ConflictResolverProps {
  conflicts: SyncConflict[];
  onResolve: (conflictId: string, resolution: 'local' | 'remote' | 'merged') => void;
}

const formatEntityType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replaceAll('_', ' ');
};

const DiffField: React.FC<{ label: string; local: unknown; remote: unknown }> = ({ label, local, remote }) => {
  const isDifferent = JSON.stringify(local) !== JSON.stringify(remote);

  if (!isDifferent) return null;

  return (
    <Paper withBorder p="xs" bg="var(--mantine-color-body)">
      <Text size="xs" fw={700} c="dimmed" mb={4}>{label}</Text>
      <Grid>
        <Grid.Col span={5}>
          <Text size="sm" style={{ wordBreak: 'break-word' }}>
            {typeof local === 'object' ? JSON.stringify(local) : String(local)}
          </Text>
        </Grid.Col>
        <Grid.Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <IconArrowRight size={14} color="gray" />
        </Grid.Col>
        <Grid.Col span={5}>
          <Text size="sm" c="blue" fw={500} style={{ wordBreak: 'break-word' }}>
            {typeof remote === 'object' ? JSON.stringify(remote) : String(remote)}
          </Text>
        </Grid.Col>
      </Grid>
    </Paper>
  );
};

const ConflictDiffViewer: React.FC<{ conflict: SyncConflict }> = ({ conflict }) => {
  let localData: Record<string, unknown> = {};
  let remoteData: Record<string, unknown> = {};

  try {
    localData = JSON.parse(conflict.local_version);
    remoteData = JSON.parse(conflict.remote_version);
  } catch {
    return (
      <Text c="red" size="sm">
        Error parsing conflict data. Raw data available in debug logs.
      </Text>
    );
  }

  // Identify common fields based on entity type (heuristic)
  const allKeys = [...new Set([...Object.keys(localData), ...Object.keys(remoteData)])];
  const ignoredKeys = new Set(['id', 'created_at', 'modified_at', 'vector_clock']); // Ignore internal fields
  const diffKeys = allKeys.filter(k => !ignoredKeys.has(k));

  return (
    <Stack gap="xs">
      {diffKeys.map(key => (
        <DiffField
          key={key}
          label={key}
          local={localData[key]}
          remote={remoteData[key]}
        />
      ))}
      {diffKeys.length === 0 && (
        <Text c="dimmed" size="sm" fs="italic">
          No visible differences in content (metadata conflict only).
        </Text>
      )}
    </Stack>
  );
};

/**
 * Conflict Resolver Component - Handle sync conflicts
 */
export const ConflictResolver: React.FC<ConflictResolverProps> = ({ conflicts, onResolve }) => {
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
          {unresolvedConflicts.length} conflict{unresolvedConflicts.length === 1 ? '' : 's'} to resolve
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
                <Text size="sm">{formatEntityType(conflict.entity_type)}</Text>
                <Badge size="xs" variant="outline">{conflict.entity_id.slice(0, 8)}</Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <ConflictDiffViewer conflict={conflict} />

                <Divider />

                <Group gap="sm" justify="flex-end">
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={<IconDeviceDesktop size={14} />}
                    onClick={() => onResolve(conflict.id, 'local')}
                  >
                    Keep Local
                  </Button>
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={<IconCloud size={14} />}
                    onClick={() => onResolve(conflict.id, 'remote')}
                  >
                    Keep Remote
                  </Button>
                  <Button
                    variant="filled"
                    size="xs"
                    color="blue"
                    leftSection={<IconGitMerge size={14} />}
                    onClick={() => onResolve(conflict.id, 'merged')}
                  >
                    Merge (Not Implemented)
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
