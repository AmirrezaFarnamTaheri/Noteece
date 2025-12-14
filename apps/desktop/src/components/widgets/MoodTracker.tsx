/**
 * MoodTracker Widget - Track mood and energy levels over time
 */

import { useState } from 'react';
import { Paper, Title, Text, Group, Stack, Select } from '@mantine/core';
import { IconMoodHappy, IconMoodSmile, IconMoodNeutral, IconMoodSad } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MoodEntry {
  date: string;
  mood: number;
  energy: number;
}

export default function MoodTracker() {
  // In a real implementation, this would come from the backend
  const moodData: MoodEntry[] = [
    { date: 'Mon', mood: 4, energy: 3 },
    { date: 'Tue', mood: 5, energy: 4 },
    { date: 'Wed', mood: 3, energy: 3 },
    { date: 'Thu', mood: 4, energy: 5 },
    { date: 'Fri', mood: 5, energy: 5 },
    { date: 'Sat', mood: 4, energy: 4 },
    { date: 'Sun', mood: 5, energy: 3 },
  ];

  const [todayMood, setTodayMood] = useState<string | null>(null);

  const avgMood = moodData.reduce((sum, d) => sum + d.mood, 0) / moodData.length;

  const getMoodIcon = (mood: number) => {
    if (mood >= 5) return <IconMoodHappy size={20} color="var(--mantine-color-green-5)" />;
    if (mood >= 4) return <IconMoodSmile size={20} color="var(--mantine-color-blue-5)" />;
    if (mood >= 3) return <IconMoodNeutral size={20} color="var(--mantine-color-yellow-5)" />;
    return <IconMoodSad size={20} color="var(--mantine-color-red-5)" />;
  };

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Title order={4}>Mood & Energy</Title>
        {getMoodIcon(avgMood)}
      </Group>

      <Stack gap="md">
        <div>
          <Text size="sm" mb="xs">
            How are you feeling today?
          </Text>
          <Select
            placeholder="Select mood"
            data={[
              { value: '5', label: '😄 Excellent' },
              { value: '4', label: '🙂 Good' },
              { value: '3', label: '😐 Okay' },
              { value: '2', label: '😕 Not great' },
              { value: '1', label: '😢 Bad' },
            ]}
            value={todayMood}
            onChange={setTodayMood}
          />
        </div>

        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={moodData}>
              <XAxis dataKey="date" stroke="var(--mantine-color-gray-6)" fontSize={12} />
              <YAxis hide domain={[0, 5]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--mantine-color-dark-7)',
                  border: '1px solid var(--mantine-color-dark-4)',
                  borderRadius: '4px',
                }}
              />
              <Area
                type="monotone"
                dataKey="mood"
                stroke="var(--mantine-color-blue-5)"
                fill="var(--mantine-color-blue-9)"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="energy"
                stroke="var(--mantine-color-green-5)"
                fill="var(--mantine-color-green-9)"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Group justify="space-between">
          <div>
            <Text size="xs" c="dimmed">
              Avg Mood
            </Text>
            <Text size="lg" fw={700} c="blue">
              {avgMood.toFixed(1)}/5
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              This Week
            </Text>
            <Text size="sm" fw={600}>
              Trending {avgMood > 3.5 ? '↗️' : avgMood > 2.5 ? '→' : '↘️'}
            </Text>
          </div>
        </Group>
      </Stack>
    </Paper>
  );
}
