/**
 * VirtualizedList Component
 *
 * High-performance list rendering using react-window for large datasets.
 * Reduces rendering complexity from O(N) to O(K) where K = visible rows.
 */

import React, { CSSProperties, useCallback, useMemo } from 'react';
import { FixedSizeList, areEqual } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import { Box, Center, Text, Loader } from '@mantine/core';

export interface VirtualizedListProps<T> {
  /** Data items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Total height of the list container */
  height: number;
  /** Width of the list (defaults to 100%) */
  width?: number | string;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  /** Key extractor function */
  getItemKey: (item: T, index: number) => string;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: string;
  /** Overscan count for smoother scrolling */
  overscanCount?: number;
  /** Class name for the list */
  className?: string;
  /** On scroll callback */
  onScroll?: (scrollOffset: number) => void;
  /** On items rendered callback */
  onItemsRendered?: (startIndex: number, stopIndex: number) => void;
}

interface ItemData<T> {
  items: T[];
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  getItemKey: (item: T, index: number) => string;
}

// Memoized row component to prevent unnecessary re-renders
// Using explicit typing to handle generic variance issues with React.memo
function Row<T>({ index, style, data }: ListChildComponentProps<ItemData<T>>) {
  const { items, renderItem } = data;
  // eslint-disable-next-line security/detect-object-injection -- index is a number from react-window
  const item = items[index];

  if (!item) {
    return null;
  }

  return <>{renderItem(item, index, style)}</>;
}

// Cast to any to work around TypeScript variance issues with generics

const MemoizedRow = React.memo(Row, areEqual);

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  renderItem,
  getItemKey,
  isLoading = false,
  emptyMessage = 'No items',
  emptyIcon = '📭',
  overscanCount = 5,
  className,
  onScroll,
  onItemsRendered,
}: VirtualizedListProps<T>) {
  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo<ItemData<T>>(
    () => ({
      items,
      renderItem,
      getItemKey,
    }),
    [items, renderItem, getItemKey],
  );

  // Handle scroll events
  const handleScroll = useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      onScroll?.(scrollOffset);
    },
    [onScroll],
  );

  // Handle items rendered
  const handleItemsRendered = useCallback(
    ({ visibleStartIndex, visibleStopIndex }: { visibleStartIndex: number; visibleStopIndex: number }) => {
      onItemsRendered?.(visibleStartIndex, visibleStopIndex);
    },
    [onItemsRendered],
  );

  // Item key function for react-window
  const itemKey = useCallback((index: number, data: ItemData<T>) => {
    const item = data.items[index];
    return item ? data.getItemKey(item, index) : `empty-${index}`;
  }, []);

  if (isLoading) {
    return (
      <Center h={height}>
        <Loader />
      </Center>
    );
  }

  if (items.length === 0) {
    return (
      <Center h={height}>
        <Box ta="center">
          <Text size="xl" mb="xs">
            {emptyIcon}
          </Text>
          <Text c="dimmed">{emptyMessage}</Text>
        </Box>
      </Center>
    );
  }

  return (
    <FixedSizeList<ItemData<T>>
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={itemData}
      itemKey={itemKey}
      overscanCount={overscanCount}
      className={className}
      onScroll={handleScroll}
      onItemsRendered={handleItemsRendered}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- complex generic type inference issue */}
      {MemoizedRow as any}
    </FixedSizeList>
  );
}

export default VirtualizedList;
