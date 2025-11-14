import React from "react";
import {
  Card,
  Stack,
  Group,
  Text,
  Progress,
  RingProgress,
  Grid,
  ThemeIcon,
  Center,
} from "@mantine/core";
import {
  IconTarget,
  IconCheckbox,
  IconNote,
  IconBook,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react";

export interface ProgressMetric {
  id: string;
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export interface ProgressDashboardProps {
  metrics: ProgressMetric[];
  title?: string;
  showOverallProgress?: boolean;
}

export function ProgressDashboard({
  metrics,
  title = "Progress Dashboard",
  showOverallProgress = true,
}: ProgressDashboardProps) {
  const calculateProgress = (metric: ProgressMetric): number => {
    if (metric.target === 0) return 0;
    return Math.min((metric.current / metric.target) * 100, 100);
  };

  const overallProgress =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + calculateProgress(m), 0) /
        metrics.length
      : 0;

  const completedMetrics = metrics.filter(
    (m) => calculateProgress(m) >= 100,
  ).length;

  if (metrics.length === 0) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md" align="center" py="xl">
          <IconTarget
            size={48}
            stroke={1.5}
            color="var(--mantine-color-gray-4)"
          />
          <Text c="dimmed">No progress metrics available</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="lg" fw={600}>
              {title}
            </Text>
            <Text size="xs" c="dimmed">
              {completedMetrics} of {metrics.length} completed
            </Text>
          </div>

          {showOverallProgress && (
            <RingProgress
              size={80}
              thickness={8}
              sections={[{ value: overallProgress, color: "blue" }]}
              label={
                <Center>
                  <Text size="sm" fw={700}>
                    {Math.round(overallProgress)}%
                  </Text>
                </Center>
              }
            />
          )}
        </Group>

        {/* Metrics Grid */}
        <Grid>
          {metrics.map((metric) => {
            const progress = calculateProgress(metric);
            const isComplete = progress >= 100;

            return (
              <Grid.Col key={metric.id} span={{ base: 12, sm: 6 }}>
                <Card
                  padding="md"
                  radius="md"
                  withBorder
                  style={{ height: "100%" }}
                >
                  <Stack gap="sm">
                    {/* Metric Header */}
                    <Group justify="space-between" align="flex-start">
                      <Group gap="xs">
                        {metric.icon && (
                          <ThemeIcon
                            variant="light"
                            color={metric.color || "blue"}
                            size="md"
                          >
                            {metric.icon}
                          </ThemeIcon>
                        )}
                        <Text size="sm" fw={600} lineClamp={1}>
                          {metric.label}
                        </Text>
                      </Group>

                      {metric.trend && metric.trend !== "neutral" && (
                        <Group gap={2}>
                          {metric.trend === "up" ? (
                            <IconTrendingUp
                              size={14}
                              color="var(--mantine-color-green-6)"
                            />
                          ) : (
                            <IconTrendingDown
                              size={14}
                              color="var(--mantine-color-red-6)"
                            />
                          )}
                          {metric.trendValue && (
                            <Text
                              size="xs"
                              c={metric.trend === "up" ? "green" : "red"}
                              fw={600}
                            >
                              {metric.trendValue}
                            </Text>
                          )}
                        </Group>
                      )}
                    </Group>

                    {/* Current / Target */}
                    <Group justify="space-between" align="baseline">
                      <Group gap={4}>
                        <Text size="xl" fw={700}>
                          {metric.current}
                        </Text>
                        <Text size="sm" c="dimmed">
                          / {metric.target}
                        </Text>
                        {metric.unit && (
                          <Text size="xs" c="dimmed">
                            {metric.unit}
                          </Text>
                        )}
                      </Group>

                      <Text
                        size="sm"
                        fw={600}
                        c={isComplete ? "green" : undefined}
                      >
                        {Math.round(progress)}%
                      </Text>
                    </Group>

                    {/* Progress Bar */}
                    <Progress
                      value={progress}
                      color={isComplete ? "green" : metric.color || "blue"}
                      size="md"
                      radius="xl"
                    />
                  </Stack>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      </Stack>
    </Card>
  );
}

// Compact list variant
export function ProgressList({
  metrics,
}: Pick<ProgressDashboardProps, "metrics">) {
  const calculateProgress = (metric: ProgressMetric): number => {
    if (metric.target === 0) return 0;
    return Math.min((metric.current / metric.target) * 100, 100);
  };

  return (
    <Stack gap="xs">
      {metrics.map((metric) => {
        const progress = calculateProgress(metric);

        return (
          <div key={metric.id}>
            <Group justify="space-between" mb={4}>
              <Group gap="xs">
                {metric.icon && (
                  <div
                    style={{
                      color: `var(--mantine-color-${metric.color || "blue"}-6)`,
                    }}
                  >
                    {metric.icon}
                  </div>
                )}
                <Text size="sm" fw={500}>
                  {metric.label}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {metric.current} / {metric.target}
              </Text>
            </Group>
            <Progress
              value={progress}
              color={metric.color || "blue"}
              size="sm"
              radius="xl"
            />
          </div>
        );
      })}
    </Stack>
  );
}

// Single metric card
export function ProgressCard({ metric }: { metric: ProgressMetric }) {
  const progress = Math.min((metric.current / metric.target) * 100, 100);
  const isComplete = progress >= 100;

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            {metric.icon && (
              <ThemeIcon
                variant="light"
                color={metric.color || "blue"}
                size="lg"
              >
                {metric.icon}
              </ThemeIcon>
            )}
            <div>
              <Text size="md" fw={600}>
                {metric.label}
              </Text>
              <Text size="xs" c="dimmed">
                {metric.current} / {metric.target} {metric.unit || ""}
              </Text>
            </div>
          </Group>

          <div>
            <Text
              size="xl"
              fw={700}
              c={isComplete ? "green" : metric.color || "blue"}
              ta="right"
            >
              {Math.round(progress)}%
            </Text>
            {metric.trend && metric.trendValue && (
              <Group gap={4} justify="flex-end">
                {metric.trend === "up" ? (
                  <IconTrendingUp
                    size={12}
                    color="var(--mantine-color-green-6)"
                  />
                ) : metric.trend === "down" ? (
                  <IconTrendingDown
                    size={12}
                    color="var(--mantine-color-red-6)"
                  />
                ) : null}
                <Text size="xs" c={metric.trend === "up" ? "green" : "red"}>
                  {metric.trendValue}
                </Text>
              </Group>
            )}
          </div>
        </Group>

        <Progress
          value={progress}
          color={isComplete ? "green" : metric.color || "blue"}
          size="lg"
          radius="xl"
        />
      </Stack>
    </Card>
  );
}

// Ring progress variant for circular display
export function ProgressRing({
  metrics,
  size = 120,
}: {
  metrics: ProgressMetric[];
  size?: number;
}) {
  const calculateProgress = (metric: ProgressMetric): number => {
    if (metric.target === 0) return 0;
    return Math.min((metric.current / metric.target) * 100, 100);
  };

  const sections = metrics.map((metric) => ({
    value: calculateProgress(metric),
    color: metric.color || "blue",
    tooltip: `${metric.label}: ${Math.round(calculateProgress(metric))}%`,
  }));

  const totalProgress =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + calculateProgress(m), 0) /
        metrics.length
      : 0;

  return (
    <Stack gap="md" align="center">
      <RingProgress
        size={size}
        thickness={12}
        sections={sections}
        label={
          <Center>
            <Stack gap={0} align="center">
              <Text size="xl" fw={700}>
                {Math.round(totalProgress)}%
              </Text>
              <Text size="xs" c="dimmed">
                Overall
              </Text>
            </Stack>
          </Center>
        }
      />

      <Stack gap="xs" style={{ width: "100%" }}>
        {metrics.map((metric, index) => (
          <Group key={metric.id} justify="space-between">
            <Group gap="xs">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: `var(--mantine-color-${metric.color || "blue"}-6)`,
                }}
              />
              <Text size="sm">{metric.label}</Text>
            </Group>
            <Text size="sm" fw={600}>
              {Math.round(calculateProgress(metric))}%
            </Text>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
