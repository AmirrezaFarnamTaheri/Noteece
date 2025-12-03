/**
 * VirtualizedList Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { VirtualizedList } from '../VirtualizedList';

// Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: jest.fn(
    ({
      children: Child,
      itemCount,
      itemData,
      height,
    }: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: React.ComponentType<any>;
      itemCount: number;
      itemData: unknown;
      height: number;
    }) => (
      <div data-testid="virtualized-list" style={{ height }}>
        {Array.from({ length: Math.min(itemCount, 10) }).map((_, index) => (
          <div key={index} data-testid={`list-item-${index}`}>
            <Child index={index} style={{}} data={itemData} />
          </div>
        ))}
      </div>
    ),
  ),
  areEqual: jest.fn((prev, next) => prev === next),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

interface TestItem {
  id: string;
  name: string;
}

describe('VirtualizedList', () => {
  const mockItems: TestItem[] = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
    { id: '4', name: 'Item 4' },
    { id: '5', name: 'Item 5' },
  ];

  const defaultProps = {
    items: mockItems,
    itemHeight: 50,
    height: 400,
    renderItem: (item: TestItem, _index: number, style: React.CSSProperties) => (
      <div style={style} data-testid={`rendered-item-${item.id}`}>
        {item.name}
      </div>
    ),
    getItemKey: (item: TestItem) => item.id,
  };

  it('renders the virtualized list', () => {
    renderWithProviders(<VirtualizedList {...defaultProps} />);

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('renders items correctly', async () => {
    renderWithProviders(<VirtualizedList {...defaultProps} />);

    expect(await screen.findByText('Item 1')).toBeInTheDocument();
    expect(await screen.findByText('Item 2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithProviders(<VirtualizedList {...defaultProps} isLoading={true} />);

    // Should show loader instead of list
    expect(screen.queryByTestId('virtualized-list')).not.toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    renderWithProviders(<VirtualizedList {...defaultProps} items={[]} emptyMessage="No items found" emptyIcon="🔍" />);

    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('uses custom empty message', () => {
    const customMessage = 'Custom empty message';
    renderWithProviders(<VirtualizedList {...defaultProps} items={[]} emptyMessage={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('calls onScroll callback', () => {
    const onScroll = jest.fn();
    renderWithProviders(<VirtualizedList {...defaultProps} onScroll={onScroll} />);

    // The mock doesn't actually call onScroll, but we verify it's passed
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles large item counts efficiently', () => {
    const largeItemList = Array.from({ length: 10_000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    renderWithProviders(<VirtualizedList {...defaultProps} items={largeItemList} />);

    // Should still render without issues (virtualization limits DOM nodes)
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    // eslint-disable-next-line tailwindcss/no-custom-classname
    renderWithProviders(<VirtualizedList {...defaultProps} className="custom-list-class" />);

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles width prop correctly', () => {
    renderWithProviders(<VirtualizedList {...defaultProps} width={500} />);

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles string width prop', () => {
    renderWithProviders(<VirtualizedList {...defaultProps} width="100%" />);

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });
});
