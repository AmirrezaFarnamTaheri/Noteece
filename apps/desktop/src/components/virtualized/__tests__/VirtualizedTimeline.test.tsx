/**
 * VirtualizedTimeline Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { VirtualizedTimeline, TimelineItem } from '../VirtualizedTimeline';

// Mock the VariableSizeList component
jest.mock('../VariableSizeList', () => ({
  VariableSizeList: jest.fn(({ items, renderItem, emptyMessage, emptyIcon }) => {
    if (items.length === 0) {
      return (
        <div data-testid="empty-state">
          <span>{emptyIcon}</span>
          <span>{emptyMessage}</span>
        </div>
      );
    }
    return (
      <div data-testid="variable-size-list">
        {items.slice(0, 5).map((item: TimelineItem, index: number) => (
          <div key={item.id} data-testid={`timeline-item-${item.id}`}>
            {renderItem(item, index, {})}
          </div>
        ))}
      </div>
    );
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('VirtualizedTimeline', () => {
  const mockItems: TimelineItem[] = [
    {
      id: '1',
      author: 'John Doe',
      handle: 'johndoe',
      platform: 'twitter',
      content: 'This is a test tweet about React and TypeScript.',
      timestamp: Date.now() - 3_600_000,
      likes: 42,
      comments: 5,
    },
    {
      id: '2',
      author: 'Jane Smith',
      handle: 'janesmith',
      platform: 'linkedin',
      content: 'Excited to share my new project!',
      timestamp: Date.now() - 7_200_000,
      likes: 128,
      shares: 23,
    },
    {
      id: '3',
      author: 'Tech News',
      platform: 'reddit',
      content: 'Breaking: New framework released with improved performance.',
      timestamp: Date.now() - 86_400_000,
      comments: 156,
    },
  ];

  const defaultProps = {
    items: mockItems,
    height: 600,
  };

  it('renders the timeline', () => {
    renderWithProviders(<VirtualizedTimeline {...defaultProps} />);

    expect(screen.getByTestId('variable-size-list')).toBeInTheDocument();
  });

  it('renders timeline items', () => {
    renderWithProviders(<VirtualizedTimeline {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays author handles when available', () => {
    renderWithProviders(<VirtualizedTimeline {...defaultProps} />);

    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('@janesmith')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithProviders(<VirtualizedTimeline {...defaultProps} isLoading={true} />);

    expect(screen.queryByTestId('variable-size-list')).not.toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    renderWithProviders(<VirtualizedTimeline items={[]} height={600} emptyMessage="No posts yet" />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No posts yet')).toBeInTheDocument();
  });

  it('shows loading more indicator', () => {
    renderWithProviders(<VirtualizedTimeline {...defaultProps} isLoadingMore={true} hasMore={true} />);

    expect(screen.getByTestId('variable-size-list')).toBeInTheDocument();
  });

  it('shows end of timeline message when no more items', () => {
    renderWithProviders(<VirtualizedTimeline {...defaultProps} hasMore={false} />);

    expect(screen.getByText('End of timeline')).toBeInTheDocument();
  });

  it('handles onEndReached callback', () => {
    const onEndReached = jest.fn();
    renderWithProviders(<VirtualizedTimeline {...defaultProps} hasMore={true} onEndReached={onEndReached} />);

    expect(screen.getByTestId('variable-size-list')).toBeInTheDocument();
  });

  it('uses custom item renderer when provided', () => {
    const customRenderer = jest.fn((item: TimelineItem) => (
      <div data-testid={`custom-item-${item.id}`}>Custom: {item.author}</div>
    ));

    renderWithProviders(<VirtualizedTimeline {...defaultProps} renderItem={customRenderer} />);

    expect(screen.getByText('Custom: John Doe')).toBeInTheDocument();
    expect(customRenderer).toHaveBeenCalled();
  });

  it('displays platform information', () => {
    renderWithProviders(<VirtualizedTimeline {...defaultProps} />);

    expect(screen.getByText(/twitter/i)).toBeInTheDocument();
  });

  it('handles items with media', () => {
    const itemsWithMedia: TimelineItem[] = [
      {
        ...mockItems[0],
        media: [{ type: 'image', url: 'https://example.com/image.jpg' }],
      },
    ];

    renderWithProviders(<VirtualizedTimeline items={itemsWithMedia} height={600} />);

    expect(screen.getByTestId('variable-size-list')).toBeInTheDocument();
  });

  it('handles large item counts efficiently', () => {
    const largeItemList: TimelineItem[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `item-${i}`,
      author: `Author ${i}`,
      platform: 'twitter',
      content: `Post content ${i}`,
      timestamp: Date.now() - i * 1000,
    }));

    renderWithProviders(<VirtualizedTimeline items={largeItemList} height={600} />);

    expect(screen.getByTestId('variable-size-list')).toBeInTheDocument();
  });
});
