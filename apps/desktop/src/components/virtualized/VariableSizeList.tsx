/**
 * VariableSizeList Component
 *
 * Virtualized list for items with variable heights.
 * Uses react-window's VariableSizeList for optimal performance.
 */

import React, { CSSProperties, useCallback, useMemo, useRef } from 'react';
import { VariableSizeList as ReactWindowVariableSizeList, areEqual } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import { Box, Center, Text, Loader } from '@mantine/core';

export interface VariableSizeListProps<T> {
  /** Data items to render */
  items: T[];
  /** Function to estimate item height (can be refined after render) */
  estimateItemHeight: (item: T, index: number) => number;
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
  /** Callback when reaching near the end (for infinite scroll) */
  onEndReached?: () => void;
  /** Threshold for triggering onEndReached (pixels from bottom) */
  endReachedThreshold?: number;
}

interface ItemData<T> {
  items: T[];
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
}

// Memoized row component
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

// Cast to work around TypeScript variance issues with generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MemoizedRow = React.memo(Row, areEqual);

export function VariableSizeList<T>({
  items,
  estimateItemHeight,
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
  onEndReached,
  endReachedThreshold = 200,
}: VariableSizeListProps<T>) {
  const listRef = useRef<ReactWindowVariableSizeList>(null);
  const itemHeights = useRef<Map<number, number>>(new Map());

  // Get item size (uses cache or estimate)
  const getItemSize = useCallback(
    (index: number) => {
      const cached = itemHeights.current.get(index);
      if (cached !== undefined) {
        return cached;
      }
      const item = items[index];
      return item ? estimateItemHeight(item, index) : 60;
    },
    [items, estimateItemHeight],
  );

  // Memoize item data
  const itemData = useMemo<ItemData<T>>(
    () => ({
      items,
      renderItem,
    }),
    [items, renderItem],
  );

  // Handle scroll events
  const handleScroll = useCallback(
    ({ scrollOffset, scrollDirection }: { scrollOffset: number; scrollDirection: 'forward' | 'backward' }) => {
      onScroll?.(scrollOffset);

      // Check if near end for infinite scroll
      if (onEndReached && scrollDirection === 'forward') {
        const totalHeight = items.reduce((sum, _, idx) => sum + getItemSize(idx), 0);
        const remainingScroll = totalHeight - scrollOffset - height;

        if (remainingScroll < endReachedThreshold) {
          onEndReached();
        }
      }
    },
    [onScroll, onEndReached, items, getItemSize, height, endReachedThreshold],
  );

  // Item key function
  const itemKey = useCallback(
    (index: number, data: ItemData<T>) => {
      const item = data.items[index];
      return item ? getItemKey(item, index) : `empty-${index}`;
    },
    [getItemKey],
  );

  // Reset cache when items change significantly
  React.useEffect(() => {
    itemHeights.current.clear();
    listRef.current?.resetAfterIndex(0);
  }, [items.length]);

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
    <ReactWindowVariableSizeList<ItemData<T>>
      ref={listRef}
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={getItemSize}
      itemData={itemData}
      itemKey={itemKey}
      overscanCount={overscanCount}
      className={className}
      onScroll={handleScroll}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- complex generic type inference issue */}
      {MemoizedRow as any}
    </ReactWindowVariableSizeList>
  );
}

export default VariableSizeList;
