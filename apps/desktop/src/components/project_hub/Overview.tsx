import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { Project, ProjectMilestone, ProjectRisk, ProjectUpdate, TimeStats } from '@noteece/types';
import { Card, Grid, Timeline, Text, Badge, Table, Group, Alert, Loader, Stack } from '@mantine/core';
import { IconInfoCircle, IconCheck, IconX, IconClock, IconPlayerPlay } from '@tabler/icons-react';
import { formatTimestamp } from '../../utils/dateUtils';
import { getProjectTimeStats } from '../../services/api';
import { logger } from '../../utils/logger';

interface OverviewContext {
  projectId: string;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
};

const Overview: React.FC = () => {
  const { projectId } = useOutletContext<OverviewContext>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchProjectData = async () => {
      setLoading(true);
      setError(null);
      try {
        const projectData: Project | null = await invoke('get_project_cmd', { id: projectId });
        if (!isActive) return;
        setProject(projectData);

        if (projectData) {
          const milestonesData: ProjectMilestone[] = await invoke('get_project_milestones_cmd', {
            projectId: projectData.id,
          });
          if (!isActive) return;
          setMilestones(milestonesData);

          const risksData: ProjectRisk[] = await invoke('get_project_risks_cmd', { projectId: projectData.id });
          if (!isActive) return;
          setRisks(risksData);

          const updatesData: ProjectUpdate[] = await invoke('get_project_updates_cmd', { projectId: projectData.id });
          if (!isActive) return;
          setUpdates(updatesData);

          // Fetch time tracking stats
          try {
            const timeStatsData = await getProjectTimeStats(projectData.id);
            if (!isActive) return;
            setTimeStats(timeStatsData);
          } catch (timeError) {
            logger.error('Failed to fetch time stats:', timeError as Error);
            // Don't fail the whole page if time stats fail
          }
        }
      } catch (error_) {
        if (isActive) {
          setError('Failed to fetch project data. Please try again later.');
          logger.error('Failed to fetch project data:', error_ as Error);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    if (projectId) {
      void fetchProjectData();
    }

    return () => {
      isActive = false;
    };
  }, [projectId]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
        {error}
      </Alert>
    );
  }

  if (!project) {
    return (
      <Alert icon={<IconInfoCircle size={16} />} title="Not Found" color="yellow">
        Project not found.
      </Alert>
    );
  }

  return (
    <Grid>
      <Grid.Col span={8}>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="apart" mt="md" mb="xs">
            <Text fw={500}>{project.title}</Text>
            <Badge color="blue" variant="light">
              {project.status}
            </Badge>
          </Group>

          <Text size="sm" c="dimmed">
            {project.goal_outcome || 'No goal specified.'}
          </Text>
        </Card>

        <Card shadow="sm" p="lg" radius="md" withBorder mt="md">
          <Text fw={500}>Updates</Text>
          <Timeline active={updates.length} bulletSize={24} lineWidth={2} mt="md">
            {updates.map((update, index) => (
              <Timeline.Item
                key={update.id}
                bullet={update.health === 'green' ? <IconCheck size={12} /> : <IconX size={12} />}
                title={`Update ${index + 1}`}
              >
                <Text c="dimmed" size="xs">
                  {formatTimestamp(update.when_at)}
                </Text>
                <Text size="sm">{update.summary}</Text>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      </Grid.Col>

      <Grid.Col span={4}>
        {timeStats && timeStats.total_seconds > 0 && (
          <Card shadow="sm" p="lg" radius="md" withBorder mb="md">
            <Group justify="apart" mb="md">
              <Text fw={500}>Time Tracked</Text>
              <IconPlayerPlay size={20} />
            </Group>
            <Stack gap="md">
              <div>
                <Text size="xl" fw={700} ta="center">
                  {formatDuration(timeStats.total_seconds)}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  Total time logged
                </Text>
              </div>
              <Group grow>
                <div>
                  <Text size="sm" fw={600}>
                    {timeStats.entry_count}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Sessions
                  </Text>
                </div>
                <div>
                  <Text size="sm" fw={600}>
                    {formatDuration(timeStats.average_seconds)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Avg session
                  </Text>
                </div>
              </Group>
            </Stack>
          </Card>
        )}

        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text fw={500}>Milestones</Text>
          <Timeline active={milestones.length} bulletSize={24} lineWidth={2} mt="md">
            {milestones.map((milestone) => (
              <Timeline.Item key={milestone.id} bullet={<IconClock size={12} />} title={milestone.title}>
                <Text c="dimmed" size="xs">
                  {milestone.due_at ? `Due by ${formatTimestamp(milestone.due_at)}` : 'No due date'}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>

        <Card shadow="sm" p="lg" radius="md" withBorder mt="md">
          <Text fw={500}>Risks</Text>
          <Table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Likelihood</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id}>
                  <td>{risk.description}</td>
                  <td>{risk.likelihood}</td>
                  <td>{risk.impact}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Grid.Col>
    </Grid>
  );
};

export default Overview;
