/**
 * LoadingState Component
 *
 * Reusable loading indicator component for async operations.
 * Use EmptyState from ./EmptyState.tsx for empty data views.
 */

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '@/lib/theme';

interface LoadingStateProps {
  /** i18n key for loading message (default: 'common.loading') */
  messageKey?: string;
  /** Size of the activity indicator */
  size?: 'small' | 'large';
}

/**
 * LoadingState component for displaying a loading indicator
 *
 * @example
 * <LoadingState messageKey="screens.sync.loading" />
 */
export function LoadingState({ messageKey = 'common.loading', size = 'large' }: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={t(messageKey)}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={styles.message}>{t(messageKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  message: {
    marginTop: spacing.lg,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
