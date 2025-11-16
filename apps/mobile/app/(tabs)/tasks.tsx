import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "@/lib/theme";
import { dbQuery, dbExecute } from "@/lib/database";
import { Task } from "@/types";
import { nanoid } from "nanoid";

type FilterType = "all" | "today" | "upcoming" | "completed";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true);

      let query = "SELECT * FROM task";
      let params: any[] = [];

      const now = Date.now();
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const todayEnd = new Date().setHours(23, 59, 59, 999);

      switch (filter) {
        case "today":
          // Handle NULL due_at by explicitly excluding it
          query +=
            " WHERE due_at IS NOT NULL AND due_at BETWEEN ? AND ? AND status != ?";
          params = [todayStart, todayEnd, "completed"];
          break;
        case "upcoming":
          // Handle NULL due_at by explicitly excluding it
          query += " WHERE due_at IS NOT NULL AND due_at > ? AND status != ?";
          params = [now, "completed"];
          break;
        case "completed":
          query += " WHERE status = ?";
          params = ["completed"];
          break;
        default:
          query += " WHERE status != ?";
          params = ["completed"];
          break;
      }

      query += " ORDER BY priority DESC, due_at ASC";

      const results = await dbQuery<Task>(query, params);
      setTasks(results);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const toggleTaskStatus = async (task: Task) => {
    try {
      const newStatus = task.status === "completed" ? "todo" : "completed";
      // Use 0 when clearing completion to avoid NULL-related issues in schemas expecting integers
      const completedAtValue = newStatus === "completed" ? Date.now() : 0;

      await dbExecute(
        "UPDATE task SET status = ?, completed_at = ? WHERE id = ?",
        [newStatus, completedAtValue, task.id],
      );

      await loadTasks();
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      return;
    }

    try {
      const now = Date.now();
      await dbExecute(
        `INSERT INTO task (id, space_id, title, status, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [nanoid(), "default", newTaskTitle.trim(), "todo", now],
      );

      setNewTaskTitle("");
      setShowAddTask(false);
      loadTasks();
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const renderTask = ({ item }: { item: Task }) => {
    const isCompleted = item.status === "completed";
    // Support both due_at (snake_case from DB) and dueAt (camelCase) defensively
    const dueAt = (item as any).due_at ?? (item as any).dueAt;
    const hasDueDate =
      typeof dueAt === "number" && Number.isFinite(dueAt) && dueAt > 0;
    const isPastDue = hasDueDate && dueAt < Date.now() && !isCompleted;

    return (
      <TouchableOpacity
        style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
        onPress={() => toggleTaskStatus(item)}
        activeOpacity={0.7}
      >
        <View style={styles.taskCheckbox}>
          <Ionicons
            name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
            size={28}
            color={isCompleted ? colors.success : colors.primary}
          />
        </View>

        <View style={styles.taskContent}>
          <Text
            style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {!!(item as any).description && !isCompleted && (
            <Text style={styles.taskDescription} numberOfLines={1}>
              {(item as any).description}
            </Text>
          )}

          {hasDueDate && (
            <View style={styles.taskMeta}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isPastDue ? colors.error : colors.textSecondary}
              />
              <Text
                style={[
                  styles.taskMetaText,
                  isPastDue ? styles.taskMetaTextOverdue : undefined,
                ]}
              >
                {new Date(dueAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {(item as any).priority &&
          ((item as any).priority === "high" ||
            (item as any).priority === "urgent") && (
            <View style={styles.taskPriorityBadge}>
              <Ionicons name="flag" size={16} color={colors.error} />
            </View>
          )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddTask(!showAddTask)}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(["all", "today", "upcoming", "completed"] as FilterType[]).map(
          (f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === f && styles.filterButtonTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {showAddTask && (
        <View style={styles.addTaskSection}>
          <TextInput
            style={styles.addTaskInput}
            placeholder="Task title..."
            placeholderTextColor={colors.textTertiary}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={addTask}
            autoFocus
          />
          <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
            <Ionicons name="checkmark" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadTasks}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-done-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyStateText}>
              {filter === "completed" ? "No completed tasks" : "No tasks yet"}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === "completed"
                ? "Complete some tasks to see them here"
                : "Tap + to add your first task"}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: {
    flexDirection: "row",
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
  addTaskSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  addTaskInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.regular,
  },
  addTaskButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskCheckbox: {
    paddingTop: 2,
  },
  taskContent: {
    flex: 1,
    gap: spacing.xs,
  },
  taskTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  taskDescription: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  taskMetaText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  taskMetaTextOverdue: {
    color: colors.error,
  },
  taskPriorityBadge: {
    paddingTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
