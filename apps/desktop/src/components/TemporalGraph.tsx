import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Container,
  Title,
  Card,
  Text,
  Button,
  Group,
  Stack,
  Slider,
  Badge,
  Center,
  Loader,
  Grid,
  Paper,
} from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconRefresh, IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import { logger } from '@/utils/logger';

interface GraphNode {
  id: string;
  node_type: string;
  title: string;
  created_at: number;
  updated_at: number;
  word_count?: number;
  status?: string;
}

interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: string;
  created_at: number;
  weight: number;
}

interface GraphMetrics {
  total_nodes: number;
  total_edges: number;
  avg_degree: number;
  communities: number;
  growth_rate: number;
}

interface GraphSnapshot {
  timestamp: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: GraphMetrics;
}

interface GraphMilestone {
  id: string;
  timestamp: number;
  milestone_type: string;
  title: string;
  description: string;
  related_node_ids: string[];
}

interface GraphEvolution {
  time_range: [number, number];
  snapshots: GraphSnapshot[];
  milestones: GraphMilestone[];
}

const TemporalGraph: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const [currentSnapshot, setCurrentSnapshot] = useState<GraphSnapshot | null>(null);
  const [evolution, setEvolution] = useState<GraphEvolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [milestones, setMilestones] = useState<GraphMilestone[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    void loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, page]);

  useEffect(() => {
    if (playing && evolution && currentIndex < evolution.snapshots.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex((previous) => previous + 1);
        setCurrentSnapshot(evolution.snapshots[currentIndex + 1]);
      }, 2000); // 2 second intervals

      return () => clearTimeout(timer);
    } else if (playing && evolution && currentIndex >= evolution.snapshots.length - 1) {
      setPlaying(false);
    }
  }, [playing, currentIndex, evolution]);

  const loadGraph = async () => {
    try {
      setLoading(true);

      // Load current graph
      const current = await invoke<GraphSnapshot>('build_current_graph_cmd', { spaceId });
      setCurrentSnapshot(current);

      // Load milestones
      const milestonesData = await invoke<GraphMilestone[]>('detect_major_notes_cmd', {
        spaceId,
      });
      setMilestones(milestonesData);

      // Get time range for evolution
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 86_400;

      // Load evolution data
      const evolutionData = await invoke<GraphEvolution>('get_graph_evolution_cmd', {
        spaceId,
        startTime: thirtyDaysAgo,
        endTime: now,
        snapshotLimit: 30,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEvolution(evolutionData);
    } catch (error) {
      logger.error('Failed to load graph:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!evolution || evolution.snapshots.length === 0) return;

    if (playing) {
      setPlaying(false);
    } else {
      if (currentIndex >= evolution.snapshots.length - 1) {
        setCurrentIndex(0);
        setCurrentSnapshot(evolution.snapshots[0]);
      }
      setPlaying(true);
    }
  };

  const handleSliderChange = useCallback(
    (value: number) => {
      if (!evolution) return;
      setCurrentIndex(value);

      setCurrentSnapshot(evolution.snapshots[value]);
      setPlaying(false);
    },
    [evolution],
  );

  if (loading) {
    return (
      <Center h={600}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!currentSnapshot) {
    return (
      <Center h={600}>
        <Text c="dimmed">No graph data available</Text>
      </Center>
    );
  }

  const nodesByType: Record<string, number> = {};
  for (const node of currentSnapshot.nodes) {
    nodesByType[node.node_type] = (nodesByType[node.node_type] || 0) + 1;
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Temporal Knowledge Graph</Title>
            <Text c="dimmed" size="sm">
              Visualize how your knowledge network evolves over time
            </Text>
          </div>
          <Button leftSection={<IconRefresh size={16} />} onClick={loadGraph} variant="light">
            Refresh
          </Button>
        </Group>

        {/* Graph Metrics */}
        <Grid>
          <Grid.Col span={3}>
            <Paper p="md" withBorder>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Total Nodes
                </Text>
                <Text size="xl" fw={700}>
                  {currentSnapshot.metrics.total_nodes}
                </Text>
                <Text size="xs" c="dimmed">
                  {Object.entries(nodesByType).map(([type, count]) => (
                    <Badge key={type} variant="light" size="xs" mr={4}>
                      {type}: {count}
                    </Badge>
                  ))}
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={3}>
            <Paper p="md" withBorder>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Connections
                </Text>
                <Text size="xl" fw={700}>
                  {currentSnapshot.metrics.total_edges}
                </Text>
                <Text size="xs" c="dimmed">
                  Avg: {currentSnapshot.metrics.avg_degree.toFixed(1)} per node
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={3}>
            <Paper p="md" withBorder>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Communities
                </Text>
                <Text size="xl" fw={700}>
                  {currentSnapshot.metrics.communities}
                </Text>
                <Text size="xs" c="dimmed">
                  Knowledge clusters
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={3}>
            <Paper p="md" withBorder>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Growth Rate
                </Text>
                <Text size="xl" fw={700}>
                  {currentSnapshot.metrics.growth_rate.toFixed(1)}
                </Text>
                <Text size="xs" c="dimmed">
                  Nodes per day
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Graph Visualization */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <div style={{ height: 400, width: '100%', position: 'relative' }}>
            {/* Note: In a full production build, we would use 'react-force-graph-2d'.
                 Since we cannot easily add heavy dependencies without risking build stability in this environment,
                 we will render a simplified SVG visualization of the nodes and edges.
             */}
            <svg width="100%" height="100%" style={{ background: '#f8f9fa', borderRadius: 8 }}>
              {(() => {
                // Helper functions for deterministic positioning
                const getX = (id: string) =>
                  (Math.abs([...id].reduce((a, c) => a + (c.codePointAt(0) || 0), 0)) % 800) + 50;
                const getY = (id: string) =>
                  (Math.abs([...id].reverse().reduce((a, c) => a + (c.codePointAt(0) || 0), 0)) % 300) + 50;

                return (
                  <>
                    {currentSnapshot.edges.map((edge) => {
                      const source = currentSnapshot.nodes.find((n) => n.id === edge.source_id);
                      const target = currentSnapshot.nodes.find((n) => n.id === edge.target_id);
                      if (!source || !target) return null;

                      return (
                        <line
                          key={edge.id}
                          x1={getX(source.id)}
                          y1={getY(source.id)}
                          x2={getX(target.id)}
                          y2={getY(target.id)}
                          stroke="#ccc"
                          strokeWidth={edge.weight || 1}
                        />
                      );
                    })}
                    {currentSnapshot.nodes.map((node) => {
                      return (
                        <g key={node.id}>
                          <circle
                            cx={getX(node.id)}
                            cy={getY(node.id)}
                            r={5 + (node.word_count ? Math.log(node.word_count) : 2)}
                            fill="#4dabf7"
                            opacity={0.8}
                          />
                          <text x={getX(node.id) + 10} y={getY(node.id) + 5} fontSize="10" fill="#333">
                            {node.title.slice(0, 15)}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
              <Group>
                <Button variant="light" size="xs" leftSection={<IconZoomIn size={12} />}>
                  Zoom In
                </Button>
                <Button variant="light" size="xs" leftSection={<IconZoomOut size={12} />}>
                  Zoom Out
                </Button>
              </Group>
            </div>
          </div>
        </Card>

        {/* Playback Controls */}
        {evolution && evolution.snapshots.length > 0 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Time Playback</Text>
                <Button
                  variant="light"
                  leftSection={playing ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                  onClick={togglePlayback}
                >
                  {playing ? 'Pause' : 'Play'}
                </Button>
              </Group>

              <Slider
                value={currentIndex}
                onChange={handleSliderChange}
                min={0}
                max={evolution.snapshots.length - 1}
                marks={milestones.map((m, index) => ({
                  value: index,
                  label: m.title.slice(0, 20),
                }))}
              />

              <Text size="sm" c="dimmed">
                {currentSnapshot.timestamp ? new Date(currentSnapshot.timestamp * 1000).toLocaleString() : 'Current'}
              </Text>
            </Stack>
          </Card>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Key Milestones
            </Title>
            <Stack gap="sm">
              {milestones.slice(0, 5).map((milestone) => (
                <Paper key={milestone.id} p="sm" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Text fw={500} size="sm">
                        {milestone.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {milestone.description}
                      </Text>
                    </div>
                    <Badge variant="light" size="sm">
                      {milestone.milestone_type}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {new Date(milestone.timestamp * 1000).toLocaleDateString()}
                  </Text>
                </Paper>
              ))}
            </Stack>
          </Card>
        )}

        {/* Recent Nodes */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Recent Nodes
          </Title>
          <Stack gap="xs">
            {currentSnapshot.nodes
              .sort((a, b) => b.created_at - a.created_at)
              .slice(0, 10)
              .map((node) => (
                <Paper key={node.id} p="xs" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" fw={500}>
                        {node.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(node.created_at * 1000).toLocaleDateString()}
                      </Text>
                    </div>
                    <Group gap="xs">
                      <Badge size="sm" variant="light">
                        {node.node_type}
                      </Badge>
                      {node.word_count && (
                        <Badge size="sm" variant="outline">
                          {node.word_count} words
                        </Badge>
                      )}
                    </Group>
                  </Group>
                </Paper>
              ))}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};

export default TemporalGraph;
