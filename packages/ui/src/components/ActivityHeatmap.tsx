import React from 'react';
import { Card, Stack, Group, Text, Tooltip } from '@mantine/core';

export interface ActivityData {
  date: string; // YYYY-MM-DD
  count: number;
  details?: string;
}

export interface ActivityHeatmapProps {
  activities: ActivityData[];
  startDate?: Date;
  endDate?: Date;
  cellSize?: number;
  cellGap?: number;
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange';
  showLegend?: boolean;
  showMonthLabels?: boolean;
  showDayLabels?: boolean;
}

const COLOR_LEVELS = {
  blue: [
    'var(--mantine-color-gray-0)',
    'var(--mantine-color-blue-1)',
    'var(--mantine-color-blue-3)',
    'var(--mantine-color-blue-5)',
    'var(--mantine-color-blue-7)',
  ],
  green: [
    'var(--mantine-color-gray-0)',
    'var(--mantine-color-green-1)',
    'var(--mantine-color-green-3)',
    'var(--mantine-color-green-5)',
    'var(--mantine-color-green-7)',
  ],
  purple: [
    'var(--mantine-color-gray-0)',
    'var(--mantine-color-violet-1)',
    'var(--mantine-color-violet-3)',
    'var(--mantine-color-violet-5)',
    'var(--mantine-color-violet-7)',
  ],
  orange: [
    'var(--mantine-color-gray-0)',
    'var(--mantine-color-orange-1)',
    'var(--mantine-color-orange-3)',
    'var(--mantine-color-orange-5)',
    'var(--mantine-color-orange-7)',
  ],
};

export function ActivityHeatmap({
  activities,
  startDate,
  endDate,
  cellSize = 12,
  cellGap = 3,
  colorScheme = 'green',
  showLegend = true,
  showMonthLabels = true,
  showDayLabels = true,
}: ActivityHeatmapProps) {
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 364 * 24 * 60 * 60 * 1000); // 52 weeks

  // Create map of date string to activity data
  const activityMap = new Map<string, ActivityData>();
  activities.forEach((activity) => {
    activityMap.set(activity.date, activity);
  });

  // Generate all weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  const current = new Date(start);

  // Start from Sunday
  const dayOfWeek = current.getDay();
  if (dayOfWeek !== 0) {
    current.setDate(current.getDate() - dayOfWeek);
  }

  while (current <= end) {
    const date = new Date(current);
    currentWeek.push(date);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    current.setDate(current.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Get max count for normalization
  const maxCount = Math.max(...activities.map((a) => a.count), 1);

  const getColorLevel = (count: number): string => {
    if (count === 0) return COLOR_LEVELS[colorScheme][0];

    const normalized = count / maxCount;
    if (normalized <= 0.25) return COLOR_LEVELS[colorScheme][1];
    if (normalized <= 0.5) return COLOR_LEVELS[colorScheme][2];
    if (normalized <= 0.75) return COLOR_LEVELS[colorScheme][3];
    return COLOR_LEVELS[colorScheme][4];
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get month labels for weeks
  const getMonthLabel = (weekIndex: number): string | null => {
    if (!weeks[weekIndex] || weeks[weekIndex].length === 0) return null;

    const firstDay = weeks[weekIndex][0];
    const month = firstDay.getMonth();

    // Only show if it's the first week of the month or first week overall
    if (weekIndex === 0) return monthLabels[month];

    const prevWeek = weeks[weekIndex - 1];
    if (prevWeek && prevWeek.length > 0) {
      const prevMonth = prevWeek[0].getMonth();
      if (month !== prevMonth) {
        return monthLabels[month];
      }
    }

    return null;
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <div>
          <Text size="lg" fw={600}>
            Activity Heatmap
          </Text>
          <Text size="xs" c="dimmed">
            {formatDateDisplay(start)} - {formatDateDisplay(end)}
          </Text>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: cellGap }}>
            {/* Day labels column */}
            {showDayLabels && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: cellGap,
                  marginRight: 8,
                }}
              >
                <div style={{ height: showMonthLabels ? 16 : 0 }} />
                {[1, 3, 5].map((dayIndex) => (
                  <div
                    key={dayIndex}
                    style={{
                      height: cellSize,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      {dayLabels[dayIndex]}
                    </Text>
                  </div>
                ))}
              </div>
            )}

            {/* Heatmap grid */}
            <div>
              {/* Month labels */}
              {showMonthLabels && (
                <div
                  style={{
                    display: 'flex',
                    gap: cellGap,
                    marginBottom: 4,
                    height: 16,
                  }}
                >
                  {weeks.map((week, weekIndex) => {
                    const label = getMonthLabel(weekIndex);
                    return (
                      <div
                        key={weekIndex}
                        style={{
                          width: cellSize,
                          fontSize: '10px',
                          color: 'var(--mantine-color-dimmed)',
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grid */}
              <div style={{ display: 'flex', gap: cellGap }}>
                {weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: cellGap,
                    }}
                  >
                    {week.map((date, dayIndex) => {
                      const dateStr = formatDate(date);
                      const activity = activityMap.get(dateStr);
                      const count = activity?.count || 0;
                      const color = getColorLevel(count);

                      return (
                        <Tooltip
                          key={dayIndex}
                          label={
                            <Stack gap={2}>
                              <Text size="xs">
                                {count} {count === 1 ? 'activity' : 'activities'}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {formatDateDisplay(date)}
                              </Text>
                              {activity?.details && (
                                <Text size="xs" c="dimmed">
                                  {activity.details}
                                </Text>
                              )}
                            </Stack>
                          }
                          position="top"
                        >
                          <div
                            style={{
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: color,
                              borderRadius: 2,
                              border: '1px solid var(--mantine-color-gray-3)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <Group justify="flex-end" gap="xs">
            <Text size="xs" c="dimmed">
              Less
            </Text>
            {COLOR_LEVELS[colorScheme].map((color, index) => (
              <div
                key={index}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: color,
                  borderRadius: 2,
                  border: '1px solid var(--mantine-color-gray-3)',
                }}
              />
            ))}
            <Text size="xs" c="dimmed">
              More
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );
}

// Compact variant with summary stats
export function ActivityHeatmapCompact({
  activities,
  colorScheme = 'green',
}: Pick<ActivityHeatmapProps, 'activities' | 'colorScheme'>) {
  const totalActivities = activities.reduce((sum, a) => sum + a.count, 0);
  const activeDays = activities.filter((a) => a.count > 0).length;
  const avgPerDay = activeDays > 0 ? (totalActivities / activeDays).toFixed(1) : '0';
  const maxDay = activities.reduce(
    (max, a) => (a.count > max.count ? a : max),
    activities[0] || { count: 0, date: '' },
  );

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Activity Summary
        </Text>

        <Group gap="xl">
          <div>
            <Text size="xl" fw={700} c={colorScheme}>
              {totalActivities}
            </Text>
            <Text size="xs" c="dimmed">
              Total activities
            </Text>
          </div>

          <div>
            <Text size="xl" fw={700} c={colorScheme}>
              {activeDays}
            </Text>
            <Text size="xs" c="dimmed">
              Active days
            </Text>
          </div>

          <div>
            <Text size="xl" fw={700} c={colorScheme}>
              {avgPerDay}
            </Text>
            <Text size="xs" c="dimmed">
              Avg per day
            </Text>
          </div>

          {maxDay.count > 0 && (
            <div>
              <Text size="xl" fw={700} c={colorScheme}>
                {maxDay.count}
              </Text>
              <Text size="xs" c="dimmed">
                Best day
              </Text>
            </div>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
