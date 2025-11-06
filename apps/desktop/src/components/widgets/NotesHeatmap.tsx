/**
 * NotesHeatmap Widget - Visual heatmap of note creation activity over time
 */

import { Paper, Title, Text, Group, Stack } from '@mantine/core';
import { IconFlame } from '@tabler/icons-react';
import { useNotes } from '../../hooks/useQueries';
import { useStore } from '../../store';

interface DayActivity {
  date: string;
  count: number;
}

export default function NotesHeatmap() {
  const { activeSpaceId } = useStore();
  const { data: notes = [] } = useNotes(activeSpaceId || '', !!activeSpaceId);

  // Calculate activity by day
  const getActivityData = (): DayActivity[] => {
    const activityMap: Record<string, number> = {};
    const today = new Date();

    // Helper to get local date key
    const toLocalDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Initialize last 90 days (local)
    for (let index = 89; index >= 0; index--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      date.setDate(date.getDate() - index);
      const key = toLocalDateKey(date);
      activityMap[key] = 0;
    }

    // Count notes by local creation date
    for (const note of notes) {
      const createdAt = note?.created_at;
      if (!createdAt) continue;
      const created = new Date(createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const key = toLocalDateKey(created);
      if (activityMap[key] !== undefined) {
        activityMap[key]++;
      }
    }

    return Object.entries(activityMap).map(([date, count]) => ({ date, count }));
  };

  const activityData = getActivityData();
  const maxCount = Math.max(...activityData.map((d) => d.count), 1);

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const now = new Date();
    const todayLocalKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;

    for (let index = activityData.length - 1; index >= 0; index--) {
      if (activityData[index].count > 0) {
        streak++;
      } else if (activityData[index].date !== todayLocalKey) {
        break;
      }
    }

    return streak;
  };

  const streak = calculateStreak();

  const getColor = (count: number) => {
    if (count === 0) return 'var(--mantine-color-dark-6)';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'var(--mantine-color-blue-9)';
    if (intensity < 0.5) return 'var(--mantine-color-blue-7)';
    if (intensity < 0.75) return 'var(--mantine-color-blue-5)';
    return 'var(--mantine-color-blue-4)';
  };

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Title order={4}>Activity Heatmap</Title>
        <IconFlame size={20} color="var(--mantine-color-orange-5)" />
      </Group>

      <Stack gap="xs">
        <Group gap="xs">
          <Text size="sm" fw={600}>
            {streak} day streak
          </Text>
          <Text size="xs" c="dimmed">
            Last 90 days
          </Text>
        </Group>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(13, 1fr)',
            gap: '3px',
            marginTop: '1rem',
          }}
        >
          {activityData.slice(-91).map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} notes`}
              style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: getColor(day.count),
                borderRadius: '2px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>

        <Group justify="space-between" mt="xs">
          <Text size="xs" c="dimmed">
            Less
          </Text>
          <Group gap="xs">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
              <div
                key={intensity}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: getColor(intensity * maxCount),
                  borderRadius: '2px',
                }}
              />
            ))}
          </Group>
          <Text size="xs" c="dimmed">
            More
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
