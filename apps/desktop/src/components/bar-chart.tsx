import { BarChart as MantineBarChart } from '@mantine/charts';
import React from 'react';
import { Project } from '@noteece/types';
import { parseDate } from '../utils/dateUtils';

interface BarChartProperties {
  data: Project[];
}

export const BarChart: React.FC<BarChartProperties> = ({ data }) => {
  const chartData = data
    .filter((project) => project.start_at) // Only include projects with start dates
    .map((project) => {
      const date = parseDate(project.start_at! * 1000);
      return {
        month: date ? date.toLocaleString('default', { month: 'long' }) : 'Unknown',
        Completed: project.status === 'done' ? 1 : 0,
        'In Progress': project.status === 'active' ? 1 : 0,
        Archived: project.status === 'archived' ? 1 : 0,
      };
    });

  return (
    <MantineBarChart
      h={240}
      data={chartData}
      dataKey="month"
      type="stacked"
      orientation="vertical"
      yAxisProps={{
        domain: [0, 100],
        tickCount: 5,
        orientation: 'left',
      }}
      xAxisProps={{
        padding: { left: 30, right: 30 },
      }}
      series={[
        { name: 'Completed', color: 'green.6' },
        { name: 'In Progress', color: 'orange.6' },
        { name: 'Archived', color: 'red.6' },
      ]}
    />
  );
};
