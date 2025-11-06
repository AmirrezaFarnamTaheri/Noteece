import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Container,
  Title,
  Card,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Alert,
  ActionIcon,
  Collapse,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconClock,
  IconBulb,
  IconTarget,
  IconTrendingUp,
} from '@tabler/icons-react';

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  context: {
    entity_id?: string;
    entity_type?: string;
    metrics: Record<string, unknown>;
  };
  suggested_actions: SuggestedAction[];
  created_at: number;
  dismissed: boolean;
}

interface SuggestedAction {
  action_type: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
}

const severityColors = {
  info: 'blue',
  low: 'cyan',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
};

const severityIcons = {
  info: IconBulb,
  low: IconTrendingUp,
  medium: IconAlertCircle,
  high: IconAlertCircle,
  critical: IconAlertCircle,
};

const Foresight: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const executingRef = React.useRef(false);

  useEffect(() => {
    void loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const result = await invoke<Insight[]>('get_active_insights_cmd', { limit: 20 });
      setInsights(result);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissInsight = async (insightId: string) => {
    try {
      await invoke('dismiss_insight_cmd', { insightId });
      await invoke('record_insight_feedback_cmd', {
        insightId,
        actionTaken: false,
        actionType: null,
        feedbackType: 'dismissed',
      });
      setInsights((prev) => prev.filter((item) => item.id !== insightId));
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  const executeAction = async (insight: Insight, action: SuggestedAction) => {
    // Re-entrancy guard using ref to prevent duplicate execution
    if (executingRef.current) return;
    executingRef.current = true;
    try {
      const requireParam = (key: string) => {
        const v = action.parameters?.[key];
        if (v === undefined || v === null || v === '') {
          throw new Error(`Missing required parameter: ${key}`);
        }
        return String(v);
      };

      // Validate ID format to prevent injection attacks
      const assertId = (id: string, name: string) => {
        // Accept ULID (26 chars) or UUID format
        const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!(ULID_RE.test(id) || UUID_RE.test(id))) {
          throw new Error(`Invalid ${name} format`);
        }
      };

      // Perform non-navigational work first
      switch (action.action_type) {
        case 'generate_weekly_review': {
          const spaceId = requireParam('space_id');
          await invoke('generate_weekly_review_cmd', { spaceId });
          break;
        }
        case 'schedule_focus': {
          console.log('Scheduling focus block:', action.parameters);
          break;
        }
        default:
          break;
      }

      // Record feedback
      await invoke('record_insight_feedback_cmd', {
        insightId: insight.id,
        actionTaken: true,
        actionType: action.action_type,
        feedbackType: 'accepted',
      });

      // Optimistically update local UI first
      setInsights((prev) => prev.filter((i) => i.id !== insight.id));

      // Ensure dismiss is sent before navigating away
      try {
        await invoke('dismiss_insight_cmd', { insightId: insight.id });
      } catch (e) {
        console.error('Failed to dismiss insight:', e);
      }

      // Navigate last, using assign to avoid bfcache issues
      switch (action.action_type) {
        case 'open_task': {
          const taskId = requireParam('task_id');
          assertId(taskId, 'task_id');
          window.location.assign(`/tasks/${encodeURIComponent(taskId)}`);
          break;
        }
        case 'review_project': {
          const projectId = requireParam('project_id');
          assertId(projectId, 'project_id');
          window.location.assign(`/projects/${encodeURIComponent(projectId)}`);
          break;
        }
        case 'start_srs_review': {
          window.location.assign('/spaced-repetition');
          break;
        }
        case 'view_tasks': {
          window.location.assign('/tasks');
          break;
        }
        case 'generate_weekly_review': {
          window.location.assign('/notes');
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      alert(String(error));
    } finally {
      executingRef.current = false;
    }
  };

  const toggleExpanded = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>Noteece Foresight</Title>
            <Text c="dimmed" size="sm">
              Intelligent insights and proactive suggestions for your workspace
            </Text>
          </div>
          <Button onClick={loadInsights} variant="light">
            Refresh
          </Button>
        </Group>

        {insights.length === 0 ? (
          <Alert icon={<IconCheck size={16} />} title="All caught up!" color="green">
            No active insights right now. Keep up the great work!
          </Alert>
        ) : (
          insights.map((insight) => {
            const SeverityIcon = severityIcons[insight.severity];
            const isExpanded = expandedInsights.has(insight.id);

            return (
              <Card key={insight.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Group align="flex-start" gap="sm">
                      <SeverityIcon size={24} color={`var(--mantine-color-${severityColors[insight.severity]}-6)`} />
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" mb={4}>
                          <Text fw={600}>{insight.title}</Text>
                          <Badge color={severityColors[insight.severity]} size="sm">
                            {insight.severity}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {insight.description}
                        </Text>
                      </div>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" onClick={() => dismissInsight(insight.id)}>
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>

                  {insight.suggested_actions.length > 0 && (
                    <>
                      <Button
                        variant="light"
                        size="xs"
                        rightSection={isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        onClick={() => toggleExpanded(insight.id)}
                        fullWidth
                      >
                        {isExpanded ? 'Hide' : 'Show'} Actions ({insight.suggested_actions.length})
                      </Button>

                      <Collapse in={isExpanded}>
                        <Stack gap="xs" mt="xs">
                          {insight.suggested_actions.map((action, index) => (
                            <Card key={index} padding="sm" withBorder>
                              <Group justify="space-between" align="center">
                                <div style={{ flex: 1 }}>
                                  <Text size="sm" fw={500}>
                                    {action.label}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {action.description}
                                  </Text>
                                </div>
                                <Button size="xs" onClick={() => executeAction(insight, action)}>
                                  Execute
                                </Button>
                              </Group>
                            </Card>
                          ))}
                        </Stack>
                      </Collapse>
                    </>
                  )}

                  <Group gap="xs" mt="xs">
                    <Badge variant="light" size="xs" leftSection={<IconClock size={12} />}>
                      {new Date(insight.created_at * 1000).toLocaleString()}
                    </Badge>
                    {insight.context.entity_type && (
                      <Badge variant="light" size="xs" leftSection={<IconTarget size={12} />}>
                        {insight.context.entity_type}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Card>
            );
          })
        )}
      </Stack>
    </Container>
  );
};

export default Foresight;
