/**
 * Health Hub Screen
 *
 * Main screen for health metrics and activity tracking.
 * Features: daily stats, goals, activities, trends.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FadeIn, SlideIn, ScaleIn } from "@/components/animations";
import { SkeletonBox } from "@/components/skeletons";
import { haptics } from "@/lib/haptics";
import type { HealthStats } from "../types/health";

const { width } = Dimensions.get("window");

// Helper function to load health data from database or HealthKit
async function loadHealthDataFromDB(): Promise<HealthStats | null> {
  try {
    // Load health stats from encrypted SQLite database
    // Falls back to native HealthKit integration if available
    // Currently returns null - will be populated when health database service is initialized
    // Note: Mobile health integration requires HealthKit (iOS) or Health Connect (Android) setup
    return null;
  } catch (error) {
    console.warn("Failed to load health data from database:", error);
    return null;
  }
}

export function HealthHub() {
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<"today" | "week" | "month">(
    "today",
  );

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      // Load health data from database or native HealthKit integration
      const dbStats = await loadHealthDataFromDB();

      // Fallback to mock data if database is empty
      const mockStats: HealthStats = {
        today: {
          steps: 8234,
          distance: 6.2,
          calories: 432,
          activeMinutes: 45,
          water: 6,
          sleep: 7.5,
          mood: 4,
        },
        week: {
          totalSteps: 52341,
          totalDistance: 39.8,
          totalCalories: 2876,
          totalActiveMinutes: 285,
          averageSteps: 7477,
          daysActive: 6,
          activities: [],
        },
        month: {
          totalSteps: 218456,
          totalDistance: 165.2,
          totalCalories: 11234,
          daysTracked: 28,
          weightChange: -1.2,
          topActivities: [],
        },
        goals: [
          {
            goal: {
              id: "1",
              type: "steps",
              target: 10000,
              unit: "steps",
              period: "daily",
              isActive: true,
              createdAt: Date.now() - 2592000000,
            },
            current: 8234,
            percentage: 82.34,
            isAchieved: false,
          },
          {
            goal: {
              id: "2",
              type: "water",
              target: 8,
              unit: "glasses",
              period: "daily",
              isActive: true,
              createdAt: Date.now() - 2592000000,
            },
            current: 6,
            percentage: 75,
            isAchieved: false,
          },
          {
            goal: {
              id: "3",
              type: "exercise",
              target: 30,
              unit: "minutes",
              period: "daily",
              isActive: true,
              createdAt: Date.now() - 2592000000,
            },
            current: 45,
            percentage: 150,
            isAchieved: true,
          },
        ],
      };

      // Use database data if available, otherwise use mock data
      setStats(dbStats || mockStats);
    } catch (error) {
      console.error("Failed to load health data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await loadHealthData();
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewChange = (view: "today" | "week" | "month") => {
    haptics.selection();
    setSelectedView(view);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toFixed(0);
  };

  const renderMetricCard = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string | number,
    unit: string,
    color: string,
    index: number = 0,
  ) => (
    <ScaleIn delay={200 + index * 50} bounce initialScale={0.8}>
      <TouchableOpacity
        style={styles.metricCard}
        onPress={() => haptics.light()}
        activeOpacity={0.8}
      >
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>
          {value} <Text style={styles.metricUnit}>{unit}</Text>
        </Text>
      </TouchableOpacity>
    </ScaleIn>
  );

  const renderGoalProgress = (goal: any) => {
    const percentage = Math.min(goal.percentage, 100);
    const isAchieved = goal.isAchieved;

    return (
      <View key={goal.goal.id} style={styles.goalItem}>
        <View style={styles.goalHeader}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>
              {goal.goal.type.charAt(0).toUpperCase() + goal.goal.type.slice(1)}{" "}
              Goal
            </Text>
            <Text style={styles.goalTarget}>
              {goal.current} / {goal.goal.target} {goal.goal.unit}
            </Text>
          </View>
          {isAchieved && (
            <View style={styles.achievedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          )}
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: isAchieved ? "#10B981" : "#6366F1",
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{percentage.toFixed(0)}%</Text>
        </View>
      </View>
    );
  };

  const renderLoadingSkeleton = () => (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#10B981", "#059669"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Health</Text>
      </LinearGradient>

      {/* Tabs Skeleton */}
      <View style={styles.tabs}>
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} width={80} height={36} borderRadius={8} />
        ))}
      </View>

      {/* Content Skeleton */}
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <SkeletonBox width={150} height={20} style={{ marginBottom: 12 }} />
          <View style={styles.metricsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.metricCard}>
                <SkeletonBox width={48} height={48} borderRadius={24} />
                <SkeletonBox width={60} height={16} style={{ marginTop: 8 }} />
                <SkeletonBox width={80} height={24} style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  if (loading || !stats) {
    return renderLoadingSkeleton();
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <FadeIn>
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Health</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => haptics.medium()}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </LinearGradient>
      </FadeIn>

      {/* View Tabs */}
      <SlideIn direction="top" delay={100}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, selectedView === "today" && styles.tabActive]}
            onPress={() => handleViewChange("today")}
          >
            <Text
              style={[
                styles.tabText,
                selectedView === "today" && styles.tabTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedView === "week" && styles.tabActive]}
            onPress={() => handleViewChange("week")}
          >
            <Text
              style={[
                styles.tabText,
                selectedView === "week" && styles.tabTextActive,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedView === "month" && styles.tabActive]}
            onPress={() => handleViewChange("month")}
          >
            <Text
              style={[
                styles.tabText,
                selectedView === "month" && styles.tabTextActive,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>
      </SlideIn>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Metrics Grid */}
        {selectedView === "today" && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Activity</Text>
              <View style={styles.metricsGrid}>
                {renderMetricCard(
                  "footsteps",
                  "Steps",
                  formatNumber(stats.today.steps),
                  "steps",
                  "#6366F1",
                  0,
                )}
                {renderMetricCard(
                  "navigate",
                  "Distance",
                  stats.today.distance.toFixed(1),
                  "km",
                  "#8B5CF6",
                  1,
                )}
                {renderMetricCard(
                  "flame",
                  "Calories",
                  formatNumber(stats.today.calories),
                  "kcal",
                  "#EF4444",
                  2,
                )}
                {renderMetricCard(
                  "timer",
                  "Active",
                  stats.today.activeMinutes,
                  "min",
                  "#F59E0B",
                  3,
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wellness</Text>
              <View style={styles.metricsGrid}>
                {renderMetricCard(
                  "water",
                  "Water",
                  stats.today.water,
                  "glasses",
                  "#3B82F6",
                  4,
                )}
                {renderMetricCard(
                  "moon",
                  "Sleep",
                  stats.today.sleep.toFixed(1),
                  "hours",
                  "#8B5CF6",
                  5,
                )}
                {renderMetricCard(
                  "happy",
                  "Mood",
                  stats.today.mood ? `${stats.today.mood}/5` : "N/A",
                  "",
                  "#10B981",
                  6,
                )}
              </View>
            </View>

            {/* Goals */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Goals</Text>
                <TouchableOpacity>
                  <Text style={styles.sectionAction}>Manage</Text>
                </TouchableOpacity>
              </View>
              {stats.goals.map(renderGoalProgress)}
            </View>
          </>
        )}

        {selectedView === "week" && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Week Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Steps</Text>
                  <Text style={styles.summaryValue}>
                    {formatNumber(stats.week.totalSteps)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Distance</Text>
                  <Text style={styles.summaryValue}>
                    {stats.week.totalDistance.toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Calories</Text>
                  <Text style={styles.summaryValue}>
                    {formatNumber(stats.week.totalCalories)} kcal
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Average Steps/Day</Text>
                  <Text style={styles.summaryValue}>
                    {formatNumber(stats.week.averageSteps)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Days Active</Text>
                  <Text style={styles.summaryValue}>
                    {stats.week.daysActive}/7
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {selectedView === "month" && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Month Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Steps</Text>
                  <Text style={styles.summaryValue}>
                    {formatNumber(stats.month.totalSteps)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Distance</Text>
                  <Text style={styles.summaryValue}>
                    {stats.month.totalDistance.toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Days Tracked</Text>
                  <Text style={styles.summaryValue}>
                    {stats.month.daysTracked}/30
                  </Text>
                </View>
                {stats.month.weightChange !== null && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Weight Change</Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        {
                          color:
                            stats.month.weightChange < 0
                              ? "#10B981"
                              : "#EF4444",
                        },
                      ]}
                    >
                      {stats.month.weightChange > 0 ? "+" : ""}
                      {stats.month.weightChange.toFixed(1)} kg
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* Add Data Button */}
        <TouchableOpacity style={styles.addButton}>
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={24} color="#FFF" />
            <Text style={styles.addButtonText}>Log Activity</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#10B981",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#10B981",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    width: (width - 44) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  goalItem: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 14,
    color: "#6B7280",
  },
  achievedBadge: {
    marginLeft: 12,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    minWidth: 45,
    textAlign: "right",
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  summaryLabel: {
    fontSize: 15,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  addButton: {
    margin: 16,
    marginBottom: 32,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFF",
  },
});
