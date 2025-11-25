import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors, typography, spacing } from '@/lib/theme';
import { dbQuery, dbExecute } from '@/lib/database';
import { Insight, SuggestedAction } from '@/types';

type InsightFilter = 'all' | 'high' | 'medium' | 'low';

export default function InsightsScreen() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<InsightFilter>('all');
  const [loading, setLoading] = useState(true);

  const handleAction = async (action: SuggestedAction) => {
    try {
      const actionType = action.actionType;
      const parameters = action.parameters;

      switch (actionType) {
        case 'navigate_to_tasks':
          router.push('/(tabs)/tasks');
          break;
        case 'navigate_to_today':
          router.push('/(tabs)/today');
          break;
        case 'navigate_to_capture':
          router.push('/(tabs)/capture');
          break;
        case 'navigate_to_more':
          router.push('/(tabs)/more');
          break;
        case 'show_message':
          Alert.alert('Insight Action', parameters?.message || 'Action executed');
          break;
        default:
          console.log('Execute action:', actionType, parameters);
          Alert.alert('Action', `Executed: ${action.label}`);
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      Alert.alert('Error', 'Failed to execute action');
    }
  };

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);

      let query = `SELECT * FROM insight WHERE dismissed = 0`;
      let params: any[] = [];

      if (filter !== 'all') {
        query += ' AND severity = ?';
        params.push(filter);
      }

      query += ' ORDER BY severity DESC, created_at DESC';

      const results = await dbQuery<any>(query, params);

      // Parse and sanitize suggested actions JSON
      const parsedInsights: Insight[] = results.map((row) => {
        let rawActions: unknown = [];
        try {
          rawActions = JSON.parse(row.suggested_actions_json || '[]');
        } catch (e) {
          console.error('Failed to parse suggested actions:', e);
        }

        // Sanitize and validate suggested actions structure
        const suggestedActions: SuggestedAction[] = Array.isArray(rawActions)
          ? (rawActions
              .map((a: any) => {
                // Normalize possible snake_case keys and validate
                const label = typeof a?.label === 'string' ? a.label : '';
                const actionType =
                  typeof a?.actionType === 'string'
                    ? a.actionType
                    : typeof a?.action_type === 'string'
                      ? a.action_type
                      : '';
                const parameters = a && typeof a.parameters === 'object' && a.parameters !== null ? a.parameters : {};

                if (!label || !actionType) return null;
                return { label, actionType, parameters } as SuggestedAction;
              })
              .filter(Boolean) as SuggestedAction[])
          : [];

        return {
          ...row,
          suggestedActions,
        };
      });

      setInsights(parsedInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const dismissInsight = async (insightId: string) => {
    try {
      await dbExecute('UPDATE insight SET dismissed = 1 WHERE id = ?', [insightId]);
      loadInsights();
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  // Normalize severity to valid values
  const normalizeSeverity = (s: unknown): 'critical' | 'high' | 'medium' | 'low' => {
    if (typeof s !== 'string') return 'low';
    const v = s.toLowerCase().trim();
    return v === 'critical' || v === 'high' || v === 'medium' ? v : 'low';
  };

  const getSeverityIcon = (severity: unknown) => {
    switch (normalizeSeverity(severity)) {
      case 'critical':
        return 'warning-outline';
      case 'high':
        return 'alert-circle-outline';
      case 'medium':
        return 'information-circle-outline';
      default:
        return 'bulb-outline';
    }
  };

  const getSeverityColor = (severity: unknown) => {
    switch (normalizeSeverity(severity)) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.primary;
      default:
        return colors.success;
    }
  };

  const getInsightTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily_brief: 'Daily Brief',
      productivity_trend: 'Productivity',
      goal_progress: 'Goal Progress',
      mood_correlation: 'Well-being',
      milestone_risk: 'Risk Alert',
    };
    return labels[type] || type;
  };

  const renderInsight = ({ item }: { item: Insight }) => {
    const severityColor = getSeverityColor(item.severity);
    const severityIcon = getSeverityIcon(item.severity);

    return (
      <View style={styles.insightCard}>
        <LinearGradient
          colors={[`${severityColor}20`, `${severityColor}05`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.insightGradient}
        >
          <View style={styles.insightHeader}>
            <View style={styles.insightHeaderLeft}>
              <Ionicons name={severityIcon as any} size={24} color={severityColor} />
              <View style={styles.insightHeaderText}>
                <Text style={styles.insightType}>{getInsightTypeLabel(item.insightType)}</Text>
                <Text style={styles.insightTitle}>{item.title}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.dismissButton} onPress={() => dismissInsight(item.id)}>
              <Ionicons name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.insightDescription}>{item.description}</Text>

          {item.suggestedActions && item.suggestedActions.length > 0 && (
            <View style={styles.actionsContainer}>
              <Text style={styles.actionsTitle}>Suggested Actions</Text>
              {item.suggestedActions.map((action, index) => (
                <TouchableOpacity key={index} style={styles.actionButton} onPress={() => handleAction(action)}>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insights</Text>
        <Text style={styles.headerSubtitle}>Foresight 3.0 powered</Text>
      </View>

      <View style={styles.filters}>
        {(['all', 'high', 'medium', 'low'] as InsightFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={insights}
        renderItem={renderInsight}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInsights} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyStateText}>No insights yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Use the app for a few days and Foresight will start generating personalized insights
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  insightCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  insightGradient: {
    padding: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  insightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.md,
  },
  insightHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  insightType: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  insightDescription: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.md,
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  actionsTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
