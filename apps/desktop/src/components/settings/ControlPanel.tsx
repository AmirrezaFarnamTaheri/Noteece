/**
 * Control Panel - Widget and Feature Configuration
 */

import React from 'react';
import { Card, Title, Text, Group, Stack, Switch, Tabs, Badge, Button, Accordion, SimpleGrid } from '@mantine/core';
import {
  IconLayoutDashboard,
  IconPuzzle,
  IconRefresh,
  IconBrain,
  IconDevices,
  IconUsers,
  IconRocket,
} from '@tabler/icons-react';
import { useControlPanelStore, WidgetConfig, FeatureConfig } from '../../store/controlPanelStore';

const categoryIcons: Record<string, React.ReactNode> = {
  productivity: <IconLayoutDashboard size={16} />,
  health: <IconBrain size={16} />,
  social: <IconUsers size={16} />,
  insights: <IconRocket size={16} />,
  other: <IconPuzzle size={16} />,
  core: <IconLayoutDashboard size={16} />,
  ai: <IconBrain size={16} />,
  sync: <IconDevices size={16} />,
  advanced: <IconRocket size={16} />,
};

interface WidgetCardProps {
  widget: WidgetConfig;
  onToggle: () => void;
}

const WidgetCard: React.FC<WidgetCardProps> = ({ widget, onToggle }) => (
  <Card
    withBorder
    p="sm"
    style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <Group justify="space-between" wrap="nowrap">
      <div style={{ flex: 1 }}>
        <Group gap="xs" mb={4}>
          <Text fw={500} size="sm">
            {widget.name}
          </Text>
          <Badge size="xs" variant="light">
            {widget.size}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {widget.description}
        </Text>
      </div>
      <Switch checked={widget.enabled} onChange={onToggle} size="md" style={{ cursor: 'pointer' }} />
    </Group>
  </Card>
);

interface FeatureCardProps {
  feature: FeatureConfig;
  onToggle: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onToggle }) => (
  <Card
    withBorder
    p="sm"
    style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <Group justify="space-between" wrap="nowrap">
      <div style={{ flex: 1 }}>
        <Group gap="xs" mb={4}>
          <Text fw={500} size="sm">
            {feature.name}
          </Text>
          {feature.beta && (
            <Badge size="xs" color="violet" variant="light">
              Beta
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {feature.description}
        </Text>
      </div>
      <Switch checked={feature.enabled} onChange={onToggle} size="md" style={{ cursor: 'pointer' }} />
    </Group>
  </Card>
);

/**
 * Control Panel Component
 */
export const ControlPanel: React.FC = () => {
  const { widgets, features, toggleWidget, toggleFeature, resetWidgets, resetFeatures } = useControlPanelStore();

  // Group widgets by category
  const widgetsByCategory: Record<string, WidgetConfig[]> = {};
  for (const widget of widgets) {
    if (!widgetsByCategory[widget.category]) widgetsByCategory[widget.category] = [];
    widgetsByCategory[widget.category].push(widget);
  }

  // Group features by category
  const featuresByCategory: Record<string, FeatureConfig[]> = {};
  for (const feature of features) {
    if (!featuresByCategory[feature.category]) featuresByCategory[feature.category] = [];
    featuresByCategory[feature.category].push(feature);
  }

  const enabledWidgets = widgets.filter((w) => w.enabled).length;
  const enabledFeatures = features.filter((f) => f.enabled).length;

  const getCategoryIcon = (category: string) => {
    if (Object.prototype.hasOwnProperty.call(categoryIcons, category)) {
      // eslint-disable-next-line security/detect-object-injection
      return categoryIcons[category];
    }
    return <IconPuzzle size={16} />;
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Control Panel</Title>
        <Text c="dimmed" size="sm">
          Customize your dashboard widgets and enable/disable features
        </Text>
      </div>

      <Tabs defaultValue="widgets">
        <Tabs.List>
          <Tabs.Tab value="widgets" leftSection={<IconLayoutDashboard size={14} />}>
            Widgets ({enabledWidgets}/{widgets.length})
          </Tabs.Tab>
          <Tabs.Tab value="features" leftSection={<IconPuzzle size={14} />}>
            Features ({enabledFeatures}/{features.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="widgets" pt="md">
          <Stack gap="md">
            <Group justify="flex-end">
              <Button variant="subtle" size="xs" leftSection={<IconRefresh size={14} />} onClick={resetWidgets}>
                Reset to Defaults
              </Button>
            </Group>

            <Accordion variant="separated">
              {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => (
                <Accordion.Item key={category} value={category}>
                  <Accordion.Control icon={getCategoryIcon(category)}>
                    <Group gap="xs">
                      <Text tt="capitalize">{category}</Text>
                      <Badge size="xs" variant="light">
                        {categoryWidgets.filter((w) => w.enabled).length}/{categoryWidgets.length}
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {categoryWidgets.map((widget) => (
                        <WidgetCard key={widget.id} widget={widget} onToggle={() => toggleWidget(widget.id)} />
                      ))}
                    </SimpleGrid>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="features" pt="md">
          <Stack gap="md">
            <Group justify="flex-end">
              <Button variant="subtle" size="xs" leftSection={<IconRefresh size={14} />} onClick={resetFeatures}>
                Reset to Defaults
              </Button>
            </Group>

            <Accordion variant="separated">
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <Accordion.Item key={category} value={category}>
                  <Accordion.Control icon={getCategoryIcon(category)}>
                    <Group gap="xs">
                      <Text tt="capitalize">{category}</Text>
                      <Badge size="xs" variant="light">
                        {categoryFeatures.filter((f) => f.enabled).length}/{categoryFeatures.length}
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {categoryFeatures.map((feature) => (
                        <FeatureCard key={feature.id} feature={feature} onToggle={() => toggleFeature(feature.id)} />
                      ))}
                    </SimpleGrid>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default ControlPanel;

// Re-export enhanced version
export { ControlPanelEnhanced } from './ControlPanelEnhanced';
