/**
 * TimelineFilters Component
 *
 * Filter controls for the unified timeline
 */

import { Card, Group, MultiSelect, Select, TextInput, Button, Stack } from '@mantine/core';
import { IconSearch, IconFilter, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { SUPPORTED_PLATFORMS } from '@noteece/types';

interface TimelineFiltersProperties {
  onFilterChange: (filters: TimelineFilterValues) => void;
}

export interface TimelineFilterValues {
  platforms: string[];
  searchQuery: string;
  sortBy: string;
  timeRange: string;
}

export function TimelineFilters({ onFilterChange }: TimelineFiltersProperties) {
  const [filters, setFilters] = useState<TimelineFilterValues>({
    platforms: [],
    searchQuery: '',
    sortBy: 'newest',
    timeRange: 'all',
  });

  const platformOptions = Object.values(SUPPORTED_PLATFORMS).map((platform) => ({
    value: platform.id,
    label: `${platform.icon} ${platform.name}`,
  }));

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'most_liked', label: 'Most Liked' },
    { value: 'most_commented', label: 'Most Commented' },
  ];

  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  const handleFilterUpdate = (key: keyof TimelineFilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const defaultFilters: TimelineFilterValues = {
      platforms: [],
      searchQuery: '',
      sortBy: 'newest',
      timeRange: 'all',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.platforms.length > 0 ||
    filters.searchQuery.length > 0 ||
    filters.sortBy !== 'newest' ||
    filters.timeRange !== 'all';

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <IconFilter size={20} />
            <span style={{ fontWeight: 500 }}>Filters</span>
          </Group>
          {hasActiveFilters && (
            <Button variant="subtle" size="xs" leftSection={<IconX size={14} />} onClick={handleClearFilters}>
              Clear All
            </Button>
          )}
        </Group>

        <Group grow align="flex-start">
          <MultiSelect
            label="Platforms"
            placeholder="All platforms"
            data={platformOptions}
            value={filters.platforms}
            onChange={(value) => handleFilterUpdate('platforms', value)}
            searchable
            clearable
          />

          <Select
            label="Time Range"
            data={timeRangeOptions}
            value={filters.timeRange}
            onChange={(value) => handleFilterUpdate('timeRange', value || 'all')}
            clearable
          />

          <Select
            label="Sort By"
            data={sortOptions}
            value={filters.sortBy}
            onChange={(value) => handleFilterUpdate('sortBy', value || 'newest')}
          />
        </Group>

        <TextInput
          label="Search"
          placeholder="Search posts, authors, content..."
          leftSection={<IconSearch size={16} />}
          value={filters.searchQuery}
          onChange={(event) => handleFilterUpdate('searchQuery', event.currentTarget.value)}
        />
      </Stack>
    </Card>
  );
}
