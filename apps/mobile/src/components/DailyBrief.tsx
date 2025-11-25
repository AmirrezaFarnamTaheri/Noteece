import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Insight } from '@/types';

interface DailyBriefProps {
  brief: Insight;
  style?: ViewStyle;
}

export function DailyBrief({ brief, style }: DailyBriefProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={[colors.primary + '15', colors.primary + '05']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="bulb" size={20} color={colors.primary} />
          </View>
          <Text style={styles.title}>{brief.title}</Text>
        </View>

        <Text style={styles.description}>{brief.description}</Text>

        {brief.suggestedActions.length > 0 && (
          <View style={styles.actions}>
            {brief.suggestedActions.slice(0, 2).map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => {
                  // Handle action
                  console.log('Action pressed:', action.actionType);
                }}
              >
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  gradient: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
    flex: 1,
  },
  description: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
});
