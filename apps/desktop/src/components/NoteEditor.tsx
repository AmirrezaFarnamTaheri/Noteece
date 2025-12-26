import React, { useState, useEffect } from 'react';
import {
  Button,
  TextInput,
  List,
  Group,
  Modal,
  Select,
  LoadingOverlay,
  Text,
  useMantineTheme,
  Paper,
  ActionIcon,
  Tooltip,
  Box,
} from '@mantine/core';
import { invoke } from '@tauri-apps/api/tauri';
import { Note } from '@noteece/types';
import { useStore } from '../store';
import { useNotes, useFormTemplates } from '../hooks/useQueries';
import LexicalEditor from './LexicalEditor';
import classes from './NoteEditor.module.css';
import { logger } from '@/utils/logger';
import { IconPlus, IconTemplate, IconTrash, IconAlignJustified, IconMinimize } from '@tabler/icons-react';

const NoteEditor: React.FC = () => {
  const theme = useMantineTheme();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [templateModalOpened, setTemplateModalOpened] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const { activeSpaceId } = useStore();

  // Use React Query hooks for data fetching
  const {
    data: notes = [],
    isLoading: notesLoading,
    refetch: refetchNotes,
  } = useNotes(activeSpaceId || '', !!activeSpaceId);
  const { data: templates = [], isLoading: templatesLoading } = useFormTemplates(activeSpaceId || '', !!activeSpaceId);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title || '');
      setContent(selectedNote.content_md || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [selectedNote]);

  const handleCreateNote = async () => {
    if (!activeSpaceId) {
      logger.warn('Cannot create note: no active space');
      return;
    }
    if (!title.trim()) {
      logger.warn('Cannot create note: title is required');
      return;
    }
    try {
      await invoke('create_note_cmd', { spaceId: activeSpaceId, title, content });
      refetchNotes(); // Refresh the list using React Query
      handleNewNoteClick();
    } catch (error) {
      logger.error('Failed to create note:', error as Error);
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) {
      logger.warn('Cannot update: no note selected');
      return;
    }
    if (!title.trim()) {
      logger.warn('Cannot update note: title is required');
      return;
    }
    try {
      await invoke('update_note_content_cmd', { id: selectedNote.id, title, content });
      refetchNotes(); // Refresh the list using React Query
    } catch (error) {
      logger.error('Failed to update note:', error as Error);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    try {
      await invoke('trash_note_cmd', { id: selectedNote.id });
      refetchNotes(); // Refresh the list using React Query
      setSelectedNote(null);
    } catch (error) {
      logger.error('Failed to delete note:', error as Error);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleNewNoteClick = () => {
    setSelectedNote(null);
    setTitle('');
    setContent('');
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;
    setTitle(template.name);
    const templateContent = template.fields
      .map((field) => `**${field.label}**: ${field.default_value || ''}`)
      .join('\n');
    setContent(templateContent);
    setTemplateModalOpened(false);
  };

  return (
    <div
      className={classes.editorContainer}
      style={{
        height: 'calc(100vh - 80px)',
        display: 'flex',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.dark[9],
      }}
    >
      <LoadingOverlay visible={notesLoading || templatesLoading} overlayProps={{ blur: 2 }} />

      <Modal
        opened={templateModalOpened}
        onClose={() => setTemplateModalOpened(false)}
        title="Create Note from Template"
        radius="lg"
        centered
        styles={{ header: { backgroundColor: theme.colors.dark[7] }, body: { backgroundColor: theme.colors.dark[7] } }}
      >
        <Select
          label="Select a template"
          placeholder="Pick one"
          data={templates.map((t) => ({ value: t.id, label: t.name }))}
          value={selectedTemplate}
          onChange={setSelectedTemplate}
          searchable
          nothingFoundMessage="No templates found"
        />
        <Button mt="md" onClick={handleCreateFromTemplate} fullWidth color="violet">
          Create
        </Button>
      </Modal>

      {/* Sidebar Note List */}
      <Paper
        className={classes.noteList}
        p="md"
        radius="lg"
        style={{
          width: 300,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.colors.dark[8],
          border: `1px solid ${theme.colors.dark[7]}`, // Subtler border
        }}
      >
        <Group justify="space-between" mb="md">
          <Text fw={800} size="sm" c="dimmed" tt="uppercase">
            All Notes
          </Text>
          <Tooltip label="Create New Note">
            <ActionIcon variant="light" color="violet" onClick={handleNewNoteClick} size="sm" radius="md">
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Button
          size="xs"
          variant="subtle"
          color="gray"
          onClick={() => setTemplateModalOpened(true)}
          mb="md"
          fullWidth
          leftSection={<IconTemplate size={14} />}
          styles={{ inner: { justifyContent: 'flex-start' } }}
        >
          New from Template
        </Button>

        <List spacing={2} listStyleType="none" style={{ overflowY: 'auto', flex: 1 }}>
          {notes.map((note) => (
            <List.Item
              key={note.id.toString()}
              onClick={() => setSelectedNote(note)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedNote(note);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Select note: ${note.title || 'Untitled'}`}
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: theme.radius.md,
                backgroundColor: selectedNote?.id === note.id ? 'rgba(132, 94, 247, 0.15)' : 'transparent',
                color: selectedNote?.id === note.id ? theme.colors.violet[3] : theme.colors.gray[4],
                transition: 'all 0.2s ease',
                fontSize: theme.fontSizes.sm,
                borderLeft:
                  selectedNote?.id === note.id ? `3px solid ${theme.colors.violet[5]}` : '3px solid transparent',
              }}
            >
              <Text truncate fw={selectedNote?.id === note.id ? 600 : 400}>
                {note.title || 'Untitled'}
              </Text>
            </List.Item>
          ))}
        </List>
      </Paper>

      {/* Editor Area */}
      <Paper
        className={classes.editor}
        p="xl"
        radius="lg"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.colors.dark[8],
          border: `1px solid ${theme.colors.dark[7]}`,
          position: 'relative',
        }}
      >
        <div
          style={{
            paddingTop: typewriterMode ? '40vh' : 0,
            paddingBottom: typewriterMode ? '40vh' : 0,
            transition: 'padding 0.3s ease',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Group justify="space-between" mb="lg">
            <TextInput
              placeholder="Untitled Note"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              size="xl"
              variant="unstyled"
              style={{ flex: 1 }}
              styles={{ input: { fontSize: '2.2rem', fontWeight: 800, color: theme.colors.gray[0], lineHeight: 1.2 } }}
            />
            <Group gap="xs">
              <Tooltip label={typewriterMode ? 'Disable Typewriter Mode' : 'Enable Typewriter Mode'}>
                <ActionIcon
                  variant="subtle"
                  onClick={() => setTypewriterMode(!typewriterMode)}
                  color={typewriterMode ? 'violet' : 'gray'}
                  size="lg"
                  aria-label={typewriterMode ? 'Disable Typewriter Mode' : 'Enable Typewriter Mode'}
                >
                  {typewriterMode ? <IconMinimize size={20} /> : <IconAlignJustified size={20} />}
                </ActionIcon>
              </Tooltip>
              {selectedNote && (
                <Tooltip label="Delete Note">
                  <ActionIcon variant="subtle" color="red" onClick={handleDeleteNote} size="lg">
                    <IconTrash size={20} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>

          {/* Lexical Editor with full rich text and markdown support */}
          <Box style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
            <LexicalEditor
              key={selectedNote ? String(selectedNote.id) : 'new-note'}
              initialContent={content}
              onChange={handleContentChange}
              placeholder="Start writing..."
            />
          </Box>

          <Group mt="lg" justify="flex-end">
            {selectedNote ? (
              <Button onClick={handleUpdateNote} color="violet" radius="md">
                Save Changes
              </Button>
            ) : (
              <Button onClick={handleCreateNote} disabled={!title.trim()} color="violet" radius="md">
                Create Note
              </Button>
            )}
          </Group>
        </div>
      </Paper>
    </div>
  );
};

export default NoteEditor;
