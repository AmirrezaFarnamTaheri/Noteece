import React, { useState, useEffect } from 'react';
import { Paper, Text, Group, Badge, Stack, useMantineTheme } from '@mantine/core';
import { IconTags, IconArrowUpRight } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { Tag } from '@noteece/types';
import { useActiveSpace } from '../../hooks/useActiveSpace';
import classes from '../Dashboard.module.css';
import { logger } from '@/utils/logger';

interface TagWithCount {
  tag: Tag;
  note_count: number;
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
        const tagsData: TagWithCount[] = await invoke('get_tags_with_counts_cmd', {
          spaceId: activeSpaceId,
        });

        setTags(tagsData.slice(0, 15)); // Top 15 tags
      } catch (error) {
        logger.error('Error fetching tags:', error as Error);
      }
    };
    void fetchTags();
  }, [activeSpaceId]);

  const maxCount = Math.max(...tags.map((t) => t.note_count), 1);

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
              key={tag.tag.id}
              size={getFontSize(tag.note_count, maxCount)}
              color={tag.tag.color || 'gray'}
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
              {tag.tag.name} ({tag.note_count})
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
