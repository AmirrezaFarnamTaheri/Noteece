import React, { useState } from 'react';
import { Card, Text, Group, Stack, ActionIcon, Badge, ScrollArea, Tooltip } from '@mantine/core';
import { IconBookmark, IconStar, IconStarFilled, IconNotes, IconChecklist, IconFolders } from '@tabler/icons-react';
import { useNotes, useTasks, useProjects } from '../../hooks/useQueries';
import { useNavigate } from 'react-router-dom';
import { LoadingCard } from '@noteece/ui';

/**
 * Bookmarks Widget - Quick access to favorite/starred items
 * Features:
 * - Star/unstar notes, tasks, and projects
 * - Quick navigation to starred items
 * - Visual indicators for item types
 * - Recently accessed items
 */
export function BookmarksWidget() {
  const navigate = useNavigate();
  const { data: notes, isLoading: notesLoading } = useNotes();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  // In a real implementation, starred items would be stored in the database
  // For now, we'll use local state as a demonstration
  const [starredNotes, setStarredNotes] = useState<Set<string>>(new Set());
  const [starredTasks, setStarredTasks] = useState<Set<string>>(new Set());
  const [starredProjects, setStarredProjects] = useState<Set<string>>(new Set());

  if (notesLoading || tasksLoading || projectsLoading) {
    return <LoadingCard lines={4} />;
  }

  const toggleNoteStar = (id: string) => {
    setStarredNotes((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleTaskStar = (id: string) => {
    setStarredTasks((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleProjectStar = (id: string) => {
    setStarredProjects((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const starredNotesList = (notes || []).filter((note) => starredNotes.has(note.id));
  const starredTasksList = (tasks || []).filter((task) => starredTasks.has(task.id));
  const starredProjectsList = (projects || []).filter((project) => starredProjects.has(project.id));

  const hasBookmarks = starredNotesList.length > 0 || starredTasksList.length > 0 || starredProjectsList.length > 0;

  // Show recent notes if no bookmarks
  const recentNotes = (notes || [])
    .filter((note) => !note.is_trashed)
    .sort((a, b) => (b.modified_at || 0) - (a.modified_at || 0))
    .slice(0, 5);

  return (
    <Card p="lg" radius="md" withBorder>
      <Group justify="apart" mb="md">
        <Group gap="xs">
          <IconBookmark size={24} />
          <Text size="lg" fw={600}>
            Bookmarks
          </Text>
        </Group>
        <Badge size="sm" variant="light">
          {starredNotesList.length + starredTasksList.length + starredProjectsList.length}
        </Badge>
      </Group>

      {hasBookmarks ? (
        <ScrollArea h={300}>
          <Stack gap="sm">
            {starredNotesList.length > 0 && (
              <>
                <Text size="xs" fw={500} c="dimmed">
                  Notes
                </Text>
                {starredNotesList.map((note) => (
                  <Group
                    key={note.id}
                    justify="space-between"
                    p="xs"
                    styles={{
                      root: {
                        borderRadius: 'var(--mantine-radius-sm)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                      },
                    }}
                    onClick={() => navigate(`/notes/${note.id}`)}
                  >
                    <Group gap="xs">
                      <IconNotes size={16} />
                      <Text size="sm" truncate style={{ maxWidth: 180 }}>
                        {note.title}
                      </Text>
                    </Group>
                    <Tooltip label="Remove from bookmarks">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="yellow"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNoteStar(note.id);
                        }}
                        aria-label={`Unbookmark ${note.title}`}
                      >
                        <IconStarFilled size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ))}
              </>
            )}

            {starredTasksList.length > 0 && (
              <>
                <Text size="xs" fw={500} c="dimmed" mt="md">
                  Tasks
                </Text>
                {starredTasksList.map((task) => (
                  <Group
                    key={task.id}
                    justify="space-between"
                    p="xs"
                    styles={{
                      root: {
                        borderRadius: 'var(--mantine-radius-sm)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                      },
                    }}
                    onClick={() => navigate('/tasks')}
                  >
                    <Group gap="xs">
                      <IconChecklist size={16} />
                      <Text size="sm" truncate style={{ maxWidth: 180 }}>
                        {task.title}
                      </Text>
                    </Group>
                    <Tooltip label="Remove from bookmarks">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="yellow"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStar(task.id);
                        }}
                        aria-label={`Unbookmark ${task.title}`}
                      >
                        <IconStarFilled size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ))}
              </>
            )}

            {starredProjectsList.length > 0 && (
              <>
                <Text size="xs" fw={500} c="dimmed" mt="md">
                  Projects
                </Text>
                {starredProjectsList.map((project) => (
                  <Group
                    key={project.id}
                    justify="space-between"
                    p="xs"
                    styles={{
                      root: {
                        borderRadius: 'var(--mantine-radius-sm)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                      },
                    }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <Group gap="xs">
                      <IconFolders size={16} />
                      <Text size="sm" truncate style={{ maxWidth: 180 }}>
                        {project.title}
                      </Text>
                    </Group>
                    <Tooltip label="Remove from bookmarks">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="yellow"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectStar(project.id);
                        }}
                        aria-label={`Unbookmark ${project.title}`}
                      >
                        <IconStarFilled size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ))}
              </>
            )}
          </Stack>
        </ScrollArea>
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed" ta="center" py="md">
            No bookmarks yet. Star your favorite items for quick access!
          </Text>
          <Text size="xs" fw={500} c="dimmed">
            Recent Notes
          </Text>
          <ScrollArea h={200}>
            <Stack gap="xs">
              {recentNotes.map((note) => (
                <Group
                  key={note.id}
                  justify="space-between"
                  p="xs"
                  styles={{
                    root: {
                      borderRadius: 'var(--mantine-radius-sm)',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'var(--mantine-color-gray-0)',
                      },
                    },
                  }}
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <Group gap="xs">
                    <IconNotes size={16} />
                    <Text size="sm" truncate style={{ maxWidth: 180 }}>
                      {note.title}
                    </Text>
                  </Group>
                  <Tooltip label="Add to bookmarks">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteStar(note.id);
                      }}
                      aria-label={`Bookmark ${note.title}`}
                    >
                      <IconStar size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      )}
    </Card>
  );
}
