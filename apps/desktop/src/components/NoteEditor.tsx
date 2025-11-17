import React, { useState, useEffect } from 'react';
import { Button, TextInput, List, Group, Modal, Select, LoadingOverlay, Text } from '@mantine/core';
import { invoke } from '@tauri-apps/api/tauri';
import { Note } from '@noteece/types';
import { useStore } from '../store';
import { useNotes, useFormTemplates } from '../hooks/useQueries';
import LexicalEditor from './LexicalEditor';
import classes from './NoteEditor.module.css';
import { logger } from '@/utils/logger';

const NoteEditor: React.FC = () => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [templateModalOpened, setTemplateModalOpened] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
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
    <div className={classes.editorContainer}>
      <LoadingOverlay visible={notesLoading || templatesLoading} />

      <Modal
        opened={templateModalOpened}
        onClose={() => setTemplateModalOpened(false)}
        title="Create Note from Template"
      >
        <Select
          label="Select a template"
          placeholder="Pick one"
          data={templates.map((t) => ({ value: t.id, label: t.name }))}
          value={selectedTemplate}
          onChange={setSelectedTemplate}
        />
        <Button mt="md" onClick={handleCreateFromTemplate}>
          Create
        </Button>
      </Modal>

      <div className={classes.noteList}>
        <Group justify="space-between" mb="sm">
          <Text fw={600} size="lg">
            Notes
          </Text>
          <Button size="xs" onClick={handleNewNoteClick}>
            New
          </Button>
        </Group>
        <Button size="xs" variant="outline" onClick={() => setTemplateModalOpened(true)} mb="sm" fullWidth>
          New from Template
        </Button>
        <List spacing="xs">
          {notes.map((note) => (
            <List.Item
              key={note.id.toString()}
              onClick={() => setSelectedNote(note)}
              style={{
                cursor: 'pointer',
                fontWeight: selectedNote?.id === note.id ? 'bold' : 'normal',
                padding: '0.5rem',
                borderRadius: '4px',
                backgroundColor: selectedNote?.id === note.id ? 'var(--mantine-color-blue-9)' : 'transparent',
              }}
            >
              {note.title}
            </List.Item>
          ))}
        </List>
      </div>

      <div className={classes.editor}>
        <TextInput
          label="Title"
          placeholder="Enter title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          size="md"
        />

        {/* Lexical Editor with full rich text and markdown support */}
        <LexicalEditor
          key={selectedNote ? String(selectedNote.id) : 'new-note'}
          initialContent={content}
          onChange={handleContentChange}
          placeholder="Start writing your note... Use markdown shortcuts like # for headings, - for lists, etc."
        />

        <Group mt="md" justify="flex-start">
          <Button onClick={handleCreateNote} disabled={selectedNote !== null || !title.trim()}>
            Create Note
          </Button>
          <Button onClick={handleUpdateNote} disabled={selectedNote === null || !title.trim()}>
            Update Note
          </Button>
          <Button onClick={handleDeleteNote} color="red" disabled={selectedNote === null}>
            Delete Note
          </Button>
        </Group>
      </div>
    </div>
  );
};

export default NoteEditor;
