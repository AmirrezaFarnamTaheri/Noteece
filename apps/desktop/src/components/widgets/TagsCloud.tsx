import React, { useState, useEffect } from 'react';
import { Paper, Text, Group, Badge, Stack, useMantineTheme } from '@mantine/core';
import { IconTags, IconArrowUpRight } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { Tag } from '@noteece/types';
import { useActiveSpace } from '../../hooks/useActiveSpace';
import classes from '../Dashboard.module.css';

interface TagWithCount extends Tag {
  noteCount: number;
}

const getFontSize = (count: number, max: number) => {
  const ratio = count / max;
  if (ratio > 0.7) return 'xl';
  if (ratio > 0.4) return 'lg';
  if (ratio > 0.2) return 'md';
  return 'sm';
};

export const TagsCloud: React.FC = () => {
  const theme = useMantineTheme();
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const { activeSpaceId } = useActiveSpace();

  useEffect(() => {
    const fetchTags = async () => {
      if (!activeSpaceId) return;
      try {
        const tagsData: Tag[] = await invoke('get_all_tags_in_space_cmd', {
          spaceId: activeSpaceId,
        });

        // For now, we'll just display tags without counts
        // In a real implementation, you'd fetch note counts per tag
        const tagsWithCounts: TagWithCount[] = tagsData.map((tag) => ({
          ...tag,
          noteCount: Math.floor(Math.random() * 20) + 1, // Placeholder
        }));

        // Sort by count
        tagsWithCounts.sort((a, b) => b.noteCount - a.noteCount);

        setTags(tagsWithCounts.slice(0, 15)); // Top 15 tags
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    void fetchTags();
  }, [activeSpaceId]);

  const maxCount = Math.max(...tags.map((t) => t.noteCount), 1);

  return (
    <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
      <Group justify="space-between" mb="md">
        <Group>
          <IconTags size={20} />
          <Text className={classes.title} fz="xs" c="dimmed">
            Popular Tags
          </Text>
        </Group>
        <IconArrowUpRight size={24} color={theme.colors.gray[6]} />
      </Group>

      <Stack gap="lg" mt="xl">
        <Group gap="xs" style={{ flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              size={getFontSize(tag.noteCount, maxCount)}
              color={tag.color || 'gray'}
              variant="light"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {tag.name} ({tag.noteCount})
            </Badge>
          ))}
        </Group>

        {tags.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No tags yet. Start adding tags to your notes!
          </Text>
        )}
      </Stack>
    </Paper>
  );
};
