// apps/desktop/src/components/LocalAnalytics.tsx

import React, { useState, useEffect } from 'react';
import { getAnalyticsData } from '@/services/api';
import { AnalyticsData } from '@noteece/types';
import { Title, Paper, SimpleGrid, Text, Group } from '@mantine/core';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LocalAnalytics: React.FC = () => {
  const [filteredData, setFilteredData] = useState<AnalyticsData | null>(null);
  // Note: Date range filtering temporarily disabled - will be re-implemented with DatePickerInput
  // const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  useEffect(() => {
    const fetchData = async () => {
      const analyticsData = await getAnalyticsData();
      setFilteredData(analyticsData);
    };
    void fetchData();
  }, []);

  // Date range filtering temporarily disabled
  // Will be re-implemented with DatePickerInput in future update
  /*
  useEffect(() => {
    if (data) {
      const [start, end] = dateRange;
      if (start && end) {
        const filtered = {
          ...data,
          tasks_completed_by_week: data.tasks_completed_by_week.filter((d) => {
            const weekDate = new Date(d.week);
            return weekDate >= start && weekDate <= end;
          }),
          notes_created_by_week: data.notes_created_by_week.filter((d) => {
            const weekDate = new Date(d.week);
            return weekDate >= start && weekDate <= end;
          }),
        };
        setFilteredData(filtered);
      } else {
        setFilteredData(data);
      }
    }
  }, [dateRange, data]);
  */

  if (!filteredData) {
    return <Text>Loading...</Text>;
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Analytics Dashboard</Title>
        {/* Date range picker will be re-implemented with DatePickerInput */}
      </Group>

      <SimpleGrid cols={3} mt="md">
        <Paper p="md" shadow="xs" withBorder>
          <Text size="lg" fw={500}>
            Total Notes
          </Text>
          <Text size="xl" fw={700}>
            {filteredData.note_count}
          </Text>
        </Paper>
        <Paper p="md" shadow="xs" withBorder>
          <Text size="lg" fw={500}>
            Total Tasks
          </Text>
          <Text size="xl" fw={700}>
            {filteredData.task_count}
          </Text>
        </Paper>
        <Paper p="md" shadow="xs" withBorder>
          <Text size="lg" fw={500}>
            Total Projects
          </Text>
          <Text size="xl" fw={700}>
            {filteredData.project_count}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper mt="lg" p="md" shadow="xs" withBorder>
        <Title order={4}>Tasks Completed per Week</Title>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData.tasks_completed_by_week}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper mt="lg" p="md" shadow="xs" withBorder>
        <Title order={4}>Notes Created per Week</Title>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData.notes_created_by_week}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </div>
  );
};

export default LocalAnalytics;
