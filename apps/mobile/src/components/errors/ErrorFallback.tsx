/**
 * ErrorFallback Component
 *
 * Lightweight error fallback for inline errors (not full screen).
 * Useful for component-level error boundaries.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "@/lib/theme";

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  message?: string;
  compact?: boolean;
}

export function ErrorFallback({
  error,
  onRetry,
  message = "Failed to load",
  compact = false,
}: ErrorFallbackProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
        <Ionicons
          name="alert-circle-outline"
          size={compact ? 32 : 48}
          color={colors.error}
        />
      </View>

      <Text style={[styles.message, compact && styles.messageCompact]}>
        {message}
      </Text>

      {__DEV__ && error && !compact && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}

      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, compact && styles.retryButtonCompact]}
          onPress={onRetry}
        >
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
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
    textAlign: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
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
