/**
 * Enhanced Control Panel - Full-featured widget and feature management
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  Switch,
  Tabs,
  Badge,
  Button,
  Accordion,
  SimpleGrid,
  TextInput,
  Tooltip,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import {
  IconLayoutDashboard,
  IconPuzzle,
  IconRefresh,
  IconBrain,
  IconDevices,
  IconUsers,
  IconRocket,
  IconSearch,
  IconSparkles,
  IconSettings,
  IconHeart,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { useControlPanelStore, WidgetConfig, FeatureConfig } from '../../store/controlPanelStore';
import { useI18n } from '../../i18n';
import classes from './ControlPanel.module.css';

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: string;
  widgets: string[];
  features: string[];
}

const PRESETS: Preset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and focused',
    icon: '🎯',
    widgets: ['quickStats', 'dueToday', 'recentNotes'],
    features: ['notes', 'tasks', 'calendar'],
  },
  {
    id: 'productivity',
    name: 'Productivity',
    description: 'Get things done',
    icon: '⚡',
    widgets: ['quickStats', 'dueToday', 'recentNotes', 'calendar', 'focusTimer', 'recentProjects', 'weeklyProgress'],
    features: ['notes', 'tasks', 'projects', 'calendar', 'localAI', 'aiInsights'],
  },
  {
    id: 'health',
    name: 'Health Focus',
    description: 'Track wellness',
    icon: '💚',
    widgets: ['quickStats', 'habits', 'goals', 'mood', 'health', 'weeklyProgress'],
    features: ['notes', 'tasks', 'habits', 'goals', 'health', 'foresight'],
  },
  {
    id: 'power',
    name: 'Power User',
    description: 'Everything enabled',
    icon: '🚀',
    widgets: [
      'quickStats',
      'dueToday',
      'recentNotes',
      'calendar',
      'focusTimer',
      'habits',
      'goals',
      'insights',
      'weeklyProgress',
      'recentProjects',
    ],
    features: [
      'notes',
      'tasks',
      'projects',
      'calendar',
      'habits',
      'goals',
      'health',
      'localAI',
      'cloudAI',
      'aiInsights',
      'aiChat',
      'p2pSync',
      'ocr',
      'spacedRepetition',
      'foresight',
    ],
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  productivity: <IconLayoutDashboard size={16} />,
  health: <IconHeart size={16} />,
  social: <IconUsers size={16} />,
  insights: <IconSparkles size={16} />,
  other: <IconPuzzle size={16} />,
  core: <IconLayoutDashboard size={16} />,
  ai: <IconBrain size={16} />,
  sync: <IconDevices size={16} />,
  advanced: <IconRocket size={16} />,
};

const categoryColors: Record<string, string> = {
  productivity: 'blue',
  health: 'green',
  social: 'violet',
  insights: 'orange',
  other: 'gray',
  core: 'blue',
  ai: 'pink',
  sync: 'cyan',
  advanced: 'red',
};

/**
 * Enhanced Control Panel Component
 */
export const ControlPanelEnhanced: React.FC = () => {
  const { t } = useI18n();
  const { widgets, features, toggleWidget, toggleFeature, resetWidgets, resetFeatures, setWidgetOrder } =
    useControlPanelStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Filter widgets and features by search
  const filteredWidgets = useMemo(() => {
    if (!searchQuery) return widgets;
    const query = searchQuery.toLowerCase();
    return widgets.filter((w) => w.name.toLowerCase().includes(query) || w.description.toLowerCase().includes(query));
  }, [widgets, searchQuery]);

  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return features;
    const query = searchQuery.toLowerCase();
    return features.filter((f) => f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query));
  }, [features, searchQuery]);

  // Group by category
  const widgetsByCategory = useMemo(() => {
    const grouped: Record<string, WidgetConfig[]> = {};
    for (const widget of filteredWidgets) {
      if (!grouped[widget.category]) grouped[widget.category] = [];
      grouped[widget.category].push(widget);
    }
    return grouped;
  }, [filteredWidgets]);

  const featuresByCategory = useMemo(() => {
    const grouped: Record<string, FeatureConfig[]> = {};
    for (const feature of filteredFeatures) {
      if (!grouped[feature.category]) grouped[feature.category] = [];
      grouped[feature.category].push(feature);
    }
    return grouped;
  }, [filteredFeatures]);

  // Stats
  const enabledWidgets = widgets.filter((w) => w.enabled).length;
  const enabledFeatures = features.filter((f) => f.enabled).length;
  const betaFeatures = features.filter((f) => f.beta && f.enabled).length;

  // Apply preset
  const applyPreset = (preset: Preset) => {
    const updatedWidgets = widgets.map((w) => ({
      ...w,
      enabled: preset.widgets.includes(w.id),
    }));
    setWidgetOrder(updatedWidgets);

    // Toggle features to match preset
    for (const f of features) {
      const shouldBeEnabled = preset.features.includes(f.id);
      if (f.enabled !== shouldBeEnabled) {
        toggleFeature(f.id);
      }
    }

    setActivePreset(preset.id);
  };

  // Quick actions
  const enableAll = (type: 'widgets' | 'features') => {
    if (type === 'widgets') {
      for (const w of widgets) {
        if (!w.enabled) toggleWidget(w.id);
      }
    } else {
      for (const f of features) {
        if (!f.enabled) toggleFeature(f.id);
      }
    }
  };

  const disableAll = (type: 'widgets' | 'features') => {
    if (type === 'widgets') {
      for (const w of widgets) {
        if (w.enabled) toggleWidget(w.id);
      }
    } else {
      for (const f of features) {
        if (f.enabled) toggleFeature(f.id);
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    if (Object.prototype.hasOwnProperty.call(categoryIcons, category)) {
      // eslint-disable-next-line security/detect-object-injection
      return categoryIcons[category];
    }
    return <IconPuzzle size={16} />;
  };

  const getCategoryColor = (category: string) => {
    if (Object.prototype.hasOwnProperty.call(categoryColors, category)) {
      // eslint-disable-next-line security/detect-object-injection
      return categoryColors[category];
    }
    return 'gray';
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <div className={classes.header}>
        <div className={classes.headerIcon}>
          <IconSettings size={24} />
        </div>
        <div>
          <Title order={3}>
            {t('settings.widgets')} & {t('settings.features')}
          </Title>
          <Text c="dimmed" size="sm">
            Customize your workspace experience
          </Text>
        </div>
      </div>

      {/* Stats */}
      <div className={classes.statsGrid}>
        <div className={classes.statCard}>
          <div className={classes.statValue}>{enabledWidgets}</div>
          <div className={classes.statLabel}>Widgets Active</div>
        </div>
        <div className={classes.statCard}>
          <div className={classes.statValue}>{enabledFeatures}</div>
          <div className={classes.statLabel}>Features Enabled</div>
        </div>
        <div className={classes.statCard}>
          <div className={classes.statValue}>{betaFeatures}</div>
          <div className={classes.statLabel}>Beta Features</div>
        </div>
        <div className={classes.statCard}>
          <div className={classes.statValue}>{widgets.length + features.length}</div>
          <div className={classes.statLabel}>Total Options</div>
        </div>
      </div>

      {/* Presets */}
      <Card withBorder p="md">
        <Text fw={600} mb="sm">
          Quick Presets
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {PRESETS.map((preset) => (
            <Paper
              key={preset.id}
              className={`${classes.presetButton} ${activePreset === preset.id ? classes.active : ''}`}
              onClick={() => applyPreset(preset)}
            >
              <div className={classes.presetIcon}>{preset.icon}</div>
              <div className={classes.presetName}>{preset.name}</div>
              <div className={classes.presetDescription}>{preset.description}</div>
            </Paper>
          ))}
        </SimpleGrid>
      </Card>

      {/* Search */}
      <TextInput
        placeholder="Search widgets and features..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        className={classes.searchInput}
      />

      {/* Tabs */}
      <Tabs defaultValue="widgets">
        <Tabs.List>
          <Tabs.Tab value="widgets" leftSection={<IconLayoutDashboard size={14} />}>
            Widgets ({enabledWidgets}/{widgets.length})
          </Tabs.Tab>
          <Tabs.Tab value="features" leftSection={<IconPuzzle size={14} />}>
            Features ({enabledFeatures}/{features.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Widgets Panel */}
        <Tabs.Panel value="widgets" pt="md">
          <Stack gap="md">
            {/* Quick Actions */}
            <div className={classes.quickActions}>
              <Tooltip label="Enable all widgets">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconEye size={14} />}
                  onClick={() => enableAll('widgets')}
                >
                  Enable All
                </Button>
              </Tooltip>
              <Tooltip label="Disable all widgets">
                <Button
                  variant="light"
                  size="xs"
                  color="gray"
                  leftSection={<IconEyeOff size={14} />}
                  onClick={() => disableAll('widgets')}
                >
                  Disable All
                </Button>
              </Tooltip>
              <Button variant="subtle" size="xs" leftSection={<IconRefresh size={14} />} onClick={resetWidgets}>
                Reset
              </Button>
            </div>

            {Object.keys(widgetsByCategory).length === 0 ? (
              <div className={classes.emptyState}>
                <IconSearch size={48} className={classes.emptyStateIcon} />
                <Text>No widgets match your search</Text>
              </div>
            ) : (
              <Accordion variant="separated" multiple defaultValue={Object.keys(widgetsByCategory)}>
                {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => (
                  <Accordion.Item key={category} value={category}>
                    <Accordion.Control>
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color={getCategoryColor(category)}>
                          {getCategoryIcon(category)}
                        </ThemeIcon>
                        <Text tt="capitalize" fw={500}>
                          {category}
                        </Text>
                        <Badge size="xs" variant="light" color={getCategoryColor(category)}>
                          {categoryWidgets.filter((w) => w.enabled).length}/{categoryWidgets.length}
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="xs">
                        {categoryWidgets.map((widget) => (
                          <div
                            key={widget.id}
                            className={`${classes.widgetCard} ${widget.enabled ? classes.enabled : ''}`}
                          >
                            <div className={classes.widgetInfo}>
                              <div className={classes.widgetName}>
                                {widget.name}
                                <span className={classes.sizeBadge}>{widget.size}</span>
                              </div>
                              <div className={classes.widgetDescription}>{widget.description}</div>
                            </div>
                            <Switch checked={widget.enabled} onChange={() => toggleWidget(widget.id)} size="md" />
                          </div>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Features Panel */}
        <Tabs.Panel value="features" pt="md">
          <Stack gap="md">
            {/* Quick Actions */}
            <div className={classes.quickActions}>
              <Tooltip label="Enable all features">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconEye size={14} />}
                  onClick={() => enableAll('features')}
                >
                  Enable All
                </Button>
              </Tooltip>
              <Tooltip label="Disable all features">
                <Button
                  variant="light"
                  size="xs"
                  color="gray"
                  leftSection={<IconEyeOff size={14} />}
                  onClick={() => disableAll('features')}
                >
                  Disable All
                </Button>
              </Tooltip>
              <Button variant="subtle" size="xs" leftSection={<IconRefresh size={14} />} onClick={resetFeatures}>
                Reset
              </Button>
            </div>

            {Object.keys(featuresByCategory).length === 0 ? (
              <div className={classes.emptyState}>
                <IconSearch size={48} className={classes.emptyStateIcon} />
                <Text>No features match your search</Text>
              </div>
            ) : (
              <Accordion variant="separated" multiple defaultValue={Object.keys(featuresByCategory)}>
                {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                  <Accordion.Item key={category} value={category}>
                    <Accordion.Control>
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color={getCategoryColor(category)}>
                          {getCategoryIcon(category)}
                        </ThemeIcon>
                        <Text tt="capitalize" fw={500}>
                          {category}
                        </Text>
                        <Badge size="xs" variant="light" color={getCategoryColor(category)}>
                          {categoryFeatures.filter((f) => f.enabled).length}/{categoryFeatures.length}
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="xs">
                        {categoryFeatures.map((feature) => (
                          <div
                            key={feature.id}
                            className={`${classes.widgetCard} ${feature.enabled ? classes.enabled : ''}`}
                          >
                            <div className={classes.widgetInfo}>
                              <div className={classes.widgetName}>
                                {feature.name}
                                {feature.beta && <span className={classes.betaBadge}>Beta</span>}
                              </div>
                              <div className={classes.widgetDescription}>{feature.description}</div>
                            </div>
                            <Switch checked={feature.enabled} onChange={() => toggleFeature(feature.id)} size="md" />
                          </div>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default ControlPanelEnhanced;
