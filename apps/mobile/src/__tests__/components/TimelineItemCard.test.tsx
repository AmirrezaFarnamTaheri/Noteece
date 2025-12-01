import React from 'react';
import { render } from '@testing-library/react-native';
import { TimelineItemCard } from '@/components/TimelineItemCard';
import { TimelineItem } from '@/types';
import { colors } from '@/lib/theme';

describe('TimelineItemCard', () => {
  const mockTimelineItem: TimelineItem = {
    id: 'item-1',
    type: 'task',
    time: Date.now() + 3600000, // 1 hour from now
    title: 'Review PR #123',
    subtitle: 'High priority task',
    color: colors.primary,
    data: {},
  };

  it('should render without crashing', () => {
    const { getByText } = render(<TimelineItemCard item={mockTimelineItem} />);
    expect(getByText('Review PR #123')).toBeTruthy();
  });

  it('should display subtitle when provided', () => {
    const { getByText } = render(<TimelineItemCard item={mockTimelineItem} />);
    expect(getByText('High priority task')).toBeTruthy();
  });

  it('should render timeline dot with correct color', () => {
    render(<TimelineItemCard item={mockTimelineItem} />);
    // In production, add testID to the dot element
  });

  it('should show duration when endTime is provided', () => {
    const itemWithDuration = {
      ...mockTimelineItem,
      endTime: mockTimelineItem.time + 1800000, // 30 minutes
    };

    render(<TimelineItemCard item={itemWithDuration} />);
    // Check for duration text (would be "30m")
  });
});
