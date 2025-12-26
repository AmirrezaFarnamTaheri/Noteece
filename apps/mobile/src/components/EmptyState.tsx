/**
 * EmptyState Component
 *
 * Reusable empty state component for lists and data views.
 * Provides consistent styling and messaging when there's no data to display.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';

export interface EmptyStateProps {
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Main message to display */
  title: string;
  /** Optional subtitle with additional context */
  subtitle?: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button handler */
  onAction?: () => void;
  /** Icon color (default: #9CA3AF) */
  iconColor?: string;
  /** Icon size (default: 64) */
  iconSize?: number;
  /** Additional container styles */
  style?: ViewStyle;
}

/**
 * EmptyState component for displaying a message when there's no data
 *
 * @example
 * <EmptyState
 *   icon="musical-notes-outline"
 *   title="No tracks yet"
 *   subtitle="Add music to your library to get started"
 *   actionLabel="Add Music"
 *   onAction={() => console.log('Add music')}
 * />
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  iconColor = '#9CA3AF',
  iconSize = 64,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole="text" accessibilityLabel={`${title}. ${subtitle || ''}`}>
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint={`Tap to ${actionLabel.toLowerCase()}`}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
