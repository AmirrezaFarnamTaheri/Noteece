import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/lib/theme';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingState({ message = 'Loading...', size = 'large' }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon = 'folder-open-outline', title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={64} color={colors.textTertiary} />
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
