import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { ComponentProps } from 'react';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '@/lib/theme';

interface LoadingStateProps {
  messageKey?: string;
  size?: 'small' | 'large';
}

export function LoadingState({ messageKey = 'common.loading', size = 'large' }: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={styles.message}>{t(messageKey)}</Text>
    </View>
  );
}

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IoniconsName;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon = 'folder-open-outline' as IoniconsName, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
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
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.6,
  },
});
