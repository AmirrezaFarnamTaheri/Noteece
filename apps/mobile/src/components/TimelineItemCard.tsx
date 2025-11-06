import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { colors, spacing, typography, borderRadius } from "@/lib/theme";
import { TimelineItem } from "@/types";

interface TimelineItemCardProps {
  item: TimelineItem;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TimelineItemCard({
  item,
  isFirst,
  isLast,
}: TimelineItemCardProps) {
  const getIcon = () => {
    switch (item.type) {
      case "task":
        return "checkmark-circle-outline";
      case "event":
        return "calendar-outline";
      case "insight":
        return "bulb-outline";
      case "block":
        return "time-outline";
      default:
        return "ellipse-outline";
    }
  };

  // Validate and normalize timestamps
  const isValidTimestamp = (ts: any): ts is number => {
    return typeof ts === "number" && Number.isFinite(ts) && ts > 0;
  };

  const validTime = isValidTimestamp(item.time) ? item.time : Date.now();
  const validEndTime = isValidTimestamp(item.endTime) ? item.endTime : null;

  const isPast = validTime < Date.now();

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7}>
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: item.color }]} />
        {!isLast && <View style={styles.line} />}
      </View>

      <View style={[styles.card, isPast && styles.cardPast]}>
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Text style={[styles.time, isPast && styles.timePast]}>
              {format(new Date(validTime), "HH:mm")}
            </Text>
            {validEndTime && validEndTime > validTime && (
              <Text style={[styles.duration, isPast && styles.timePast]}>
                {" · "}
                {Math.round((validEndTime - validTime) / 60000)}m
              </Text>
            )}
          </View>
          <View
            style={[styles.typeIcon, { backgroundColor: item.color + "20" }]}
          >
            <Ionicons name={getIcon()} size={16} color={item.color} />
          </View>
        </View>

        <Text
          style={[styles.title, isPast && styles.titlePast]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {item.subtitle && (
          <Text
            style={[styles.subtitle, isPast && styles.subtitlePast]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  timeline: {
    width: 24,
    alignItems: "center",
    paddingTop: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginLeft: spacing.md,
  },
  cardPast: {
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  time: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
  timePast: {
    color: colors.textSecondary,
  },
  duration: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  typeIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  titlePast: {
    color: colors.textSecondary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  subtitlePast: {
    color: colors.textTertiary,
  },
});
