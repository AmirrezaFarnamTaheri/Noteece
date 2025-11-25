/**
 * ErrorFallback Component
 *
 * Enhanced error fallback with categorized error types and animations.
 * Provides specific feedback for network, permission, timeout, and other errors.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/lib/theme';
import { Shake } from '../animations';

export enum ErrorCategory {
  NETWORK = 'network',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  AUTH = 'auth',
  STORAGE = 'storage',
  UNKNOWN = 'unknown',
}

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  message?: string;
  compact?: boolean;
  category?: ErrorCategory;
}

function categorizeError(error?: Error): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN;

  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  if (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('connection') ||
    name.includes('networkerror')
  ) {
    return ErrorCategory.NETWORK;
  }

  if (message.includes('permission') || message.includes('denied')) {
    return ErrorCategory.PERMISSION;
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorCategory.TIMEOUT;
  }

  if (message.includes('not found') || message.includes('404')) {
    return ErrorCategory.NOT_FOUND;
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }

  if (message.includes('auth') || message.includes('token') || message.includes('401')) {
    return ErrorCategory.AUTH;
  }

  if (message.includes('storage') || message.includes('quota')) {
    return ErrorCategory.STORAGE;
  }

  return ErrorCategory.UNKNOWN;
}

interface ErrorConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  defaultMessage: string;
}

const ERROR_CONFIGS: Record<ErrorCategory, ErrorConfig> = {
  [ErrorCategory.NETWORK]: {
    icon: 'cloud-offline-outline',
    color: '#FF6B6B',
    defaultMessage: 'No internet connection',
  },
  [ErrorCategory.PERMISSION]: {
    icon: 'lock-closed-outline',
    color: '#FFA94D',
    defaultMessage: 'Permission required',
  },
  [ErrorCategory.TIMEOUT]: {
    icon: 'time-outline',
    color: '#FFD93D',
    defaultMessage: 'Request timed out',
  },
  [ErrorCategory.NOT_FOUND]: {
    icon: 'search-outline',
    color: '#A0A0A0',
    defaultMessage: 'Not found',
  },
  [ErrorCategory.VALIDATION]: {
    icon: 'alert-circle-outline',
    color: '#FFD93D',
    defaultMessage: 'Invalid input',
  },
  [ErrorCategory.AUTH]: {
    icon: 'key-outline',
    color: '#74C0FC',
    defaultMessage: 'Authentication required',
  },
  [ErrorCategory.STORAGE]: {
    icon: 'save-outline',
    color: '#FF6B6B',
    defaultMessage: 'Storage error',
  },
  [ErrorCategory.UNKNOWN]: {
    icon: 'warning-outline',
    color: colors.error,
    defaultMessage: 'Failed to load',
  },
};

export function ErrorFallback({ error, onRetry, message, compact = false, category }: ErrorFallbackProps) {
  const errorCategory = category || categorizeError(error);
  const config = ERROR_CONFIGS[errorCategory];
  const displayMessage = message || config.defaultMessage;

  return (
    <Shake intensity={compact ? 5 : 8} repeat={1} trigger={true}>
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
          <Ionicons name={config.icon} size={compact ? 32 : 48} color={config.color} />
        </View>

        <Text style={[styles.message, compact && styles.messageCompact]}>{displayMessage}</Text>

        {__DEV__ && error && !compact && <Text style={styles.errorText}>{error.message}</Text>}

        {onRetry && (
          <TouchableOpacity style={[styles.retryButton, compact && styles.retryButtonCompact]} onPress={onRetry}>
            <Ionicons name="refresh" size={16} color={config.color} />
            <Text style={[styles.retryText, { color: config.color }]}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </Shake>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  containerCompact: {
    padding: spacing.md,
    minHeight: 100,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  iconContainerCompact: {
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  messageCompact: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 8,
  },
  retryButtonCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
});
