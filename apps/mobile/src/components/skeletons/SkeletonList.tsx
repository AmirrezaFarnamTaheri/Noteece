/**
 * SkeletonList Component
 *
 * Provides skeleton loading placeholder for list items.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { spacing, colors } from '@/lib/theme';

interface SkeletonListItemProps {
  showAvatar?: boolean;
  lines?: number;
}

export function SkeletonListItem({ showAvatar = true, lines = 2 }: SkeletonListItemProps) {
  return (
    <View style={styles.listItem}>
      {showAvatar && <SkeletonBox width={48} height={48} borderRadius={24} style={styles.avatar} />}
      <View style={styles.content}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBox key={index} width={index === lines - 1 ? '70%' : '90%'} height={14} style={styles.line} />
        ))}
      </View>
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  lines?: number;
}

export function SkeletonList({ count = 5, showAvatar = true, lines = 2 }: SkeletonListProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} showAvatar={showAvatar} lines={lines} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  avatar: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  line: {
    marginBottom: spacing.xs,
  },
});
