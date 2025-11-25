import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { useTodayTimeline } from '@/hooks/useTodayTimeline';
import { DailyBrief } from '@/components/DailyBrief';
import { TimelineItemCard } from '@/components/TimelineItemCard';

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { timeline, brief, refresh } = useTodayTimeline();
  const [scrollY] = useState(new Animated.Value(0));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const currentTime = new Date();
  const greeting =
    currentTime.getHours() < 12 ? 'Good morning' : currentTime.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.headerTitle}>Today</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        </View>

        {/* Daily Brief (Foresight) */}
        {brief && <DailyBrief brief={brief} style={styles.brief} />}

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Your Day</Text>
          </View>

          {timeline.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="sunny-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nothing scheduled</Text>
              <Text style={styles.emptyDescription}>Enjoy your free day or add some tasks to get started</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timeline.map((item, index) => (
                <TimelineItemCard
                  key={item.id}
                  item={item}
                  isFirst={index === 0}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <QuickActionButton icon="add-outline" label="Add Task" onPress={() => {}} color={colors.task} />
          <QuickActionButton icon="create-outline" label="New Note" onPress={() => {}} color={colors.note} />
          <QuickActionButton icon="play-outline" label="Start Timer" onPress={() => {}} color={colors.success} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface QuickActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
}

function QuickActionButton({ icon, label, onPress, color }: QuickActionButtonProps) {
  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    zIndex: 10,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  greetingContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  greeting: {
    fontSize: typography.fontSize.xxxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  brief: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  timelineContainer: {
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  timeline: {
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  quickActionButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
