import { Group, Paper, Text } from '@mantine/core';
import React from 'react';
import classes from './stats-card.module.css';

interface StatsCardProperties {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
  backgroundColor: string;
}

export const StatsCard: React.FC<StatsCardProperties> = ({ icon, title, value, color, backgroundColor }) => {
  return (
    <Paper
      style={{
        border: '1px solid #e0e0e0',
      }}
      className={classes.container}
      p="md"
      radius="md"
      shadow="xs"
      mb="md"
    >
      <Group justify="space-between">
        <Text
          style={{
            color,
            backgroundColor,
          }}
          className={classes.title}
          fz="xs"
          c="dimmed"
        >
          {title}
        </Text>
        {icon}
      </Group>

      <Group align="flex-end" gap="xs" mt={25}>
        <Text className={classes.value}>{value}</Text>
      </Group>
    </Paper>
  );
};
