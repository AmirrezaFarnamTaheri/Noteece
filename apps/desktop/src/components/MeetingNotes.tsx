import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Textarea, TextInput, Button, Card, Text, Stack, Group, Badge, List, Alert } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { showSuccess, showError } from '../utils/notifications';
import { useActiveSpace } from '../hooks/useActiveSpace';
import logger from '../utils/logger';

interface MeetingNotesProperties {
  noteId?: string; // Optional: editing an existing note
}

interface ActionItem {
  owner: string;
  task: string;
}

const MeetingNotes: React.FC<MeetingNotesProperties> = ({ noteId }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Meeting Note');
  const [loading, setLoading] = useState(false);
  const [extractedActions, setExtractedActions] = useState<ActionItem[]>([]);
  const { activeSpaceId } = useActiveSpace();

  // Extract action items from content
  useEffect(() => {
    const actionItemPattern = /^-\s*\[\s*]\s*@(\w+)\s+(.+)$/gm;
    const actions: ActionItem[] = [];
    let match;

    while ((match = actionItemPattern.exec(content)) !== null) {
      actions.push({
        owner: match[1],
        task: match[2].trim(),
      });
    }

    setExtractedActions(actions);
  }, [content]);

  const handleSave = async () => {
    if (!activeSpaceId) {
      showError({ message: 'No active space selected' });
      return;
    }

    setLoading(true);
    try {
      // Save the note
      await (noteId
        ? invoke('update_note_content_cmd', { id: noteId, title, content })
        : invoke('create_note_cmd', {
            spaceId: activeSpaceId,
            title,
            contentMd: content,
          }));

      // Create tasks from extracted action items
      if (extractedActions.length > 0) {
        for (const action of extractedActions) {
          try {
            await invoke('create_task_cmd', {
              spaceId: activeSpaceId,
              title: `${action.task} (@${action.owner})`,
              description: `Action item from meeting: ${title}`,
            });
          } catch (error) {
            logger.error('Error creating task:', error as Error);
          }
        }
      }

      showSuccess({
        title: 'Meeting note saved!',
        message: `Created ${extractedActions.length} action items`,
      });
    } catch (error) {
      showError({ message: 'Failed to save meeting note' });
      logger.error('Error saving meeting note:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>
        Meeting Notes
      </Text>

      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            label="Meeting Title"
            placeholder="Enter meeting title..."
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            required
          />

          <Textarea
            label="Meeting Notes"
            placeholder="Start typing your meeting notes here...&#10;&#10;Use - [ ] @owner Task description to create action items"
            value={content}
            onChange={(event) => setContent(event.currentTarget.value)}
            minRows={12}
            autosize
          />

          {extractedActions.length > 0 && (
            <Alert icon={<IconCheck size={16} />} title="Action Items Detected" color="blue">
              <Text size="sm" mb="xs">
                {extractedActions.length} action item(s) will be created as tasks:
              </Text>
              <List size="sm">
                {extractedActions.map((action, index) => (
                  <List.Item key={index}>
                    <Group gap="xs">
                      <Badge size="sm" color="blue">
                        @{action.owner}
                      </Badge>
                      <Text size="sm">{action.task}</Text>
                    </Group>
                  </List.Item>
                ))}
              </List>
            </Alert>
          )}

          <Group justify="flex-end">
            <Button onClick={handleSave} loading={loading} disabled={!title.trim()}>
              {loading ? 'Saving...' : 'Save Meeting Note & Create Tasks'}
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card shadow="sm" p="md" radius="md" withBorder>
        <Stack gap="xs">
          <Text fw={500} size="sm">
            💡 Quick Guide
          </Text>
          <Text size="sm" c="dimmed">
            To create action items automatically, use this syntax:
          </Text>
          <Card bg="gray.0" p="xs">
            <code>- [ ] @owner Task description</code>
          </Card>
          <Text size="sm" c="dimmed">
            Example:
          </Text>
          <Card bg="gray.0" p="xs">
            <code>- [ ] @jules Implement the new dashboard widget</code>
            <br />
            <code>- [ ] @sarah Review the pull request</code>
          </Card>
          <Text size="xs" c="dimmed">
            When you save, these will automatically become tasks linked to this meeting note.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};

export default MeetingNotes;
