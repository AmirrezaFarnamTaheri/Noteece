import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/lib/theme';
import { dbExecute } from '@/lib/database';
import { nanoid } from 'nanoid';

type CaptureType = 'note' | 'task' | 'voice' | 'photo';

interface CaptureOption {
  type: CaptureType;
  icon: string;
  label: string;
  description: string;
  disabled?: boolean;
}

export default function CaptureScreen() {
  const [captureType, setCaptureType] = useState<CaptureType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleCapture = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Empty Content', 'Please enter some content to capture');
      return;
    }

    try {
      const now = Date.now();
      const id = nanoid();

      if (captureType === 'note') {
        // Ensure title is non-empty with proper trimming and fallback
        const noteTitle = (title?.trim() || 'Quick Note').substring(0, 200);
        const finalNoteTitle = noteTitle.length > 0 ? noteTitle : 'Quick Note';

        await dbExecute(
          `INSERT INTO note (id, space_id, title, content_md, created_at, modified_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, 'default', finalNoteTitle, content, now, now],
        );
      } else if (captureType === 'task') {
        // Ensure task title is non-empty with proper trimming and fallback
        let taskTitle = title?.trim();

        // If no title, try to extract from first line of content
        if (!taskTitle || taskTitle.length === 0) {
          const firstLine = content?.split('\n')[0]?.trim();
          taskTitle = firstLine && firstLine.length > 0 ? firstLine : 'New Task';
        }

        // Limit length and ensure non-empty
        taskTitle = taskTitle.substring(0, 200);
        const finalTaskTitle = taskTitle.length > 0 ? taskTitle : 'New Task';

        // Initialize all task fields with default values.
        // Schema: status='next', priority=3 (Normal). Removed created_at as it's not in schema.
        await dbExecute(
          `INSERT INTO task (id, space_id, title, description, status, completed_at, priority, due_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, 'default', finalTaskTitle, content, 'next', null, 3, null],
        );
      }

      // Clear form
      setTitle('');
      setContent('');

      // Navigate back
      router.back();

      Alert.alert('Success', `${captureType === 'note' ? 'Note' : 'Task'} captured successfully`);
    } catch (error) {
      console.error('Failed to capture:', error);
      Alert.alert('Error', 'Failed to capture. Please try again.');
    }
  };

  const captureOptions: CaptureOption[] = [
    {
      type: 'note',
      icon: 'document-text-outline',
      label: 'Note',
      description: 'Capture thoughts and ideas',
    },
    {
      type: 'task',
      icon: 'checkmark-circle-outline',
      label: 'Task',
      description: 'Add a quick task',
    },
    // Voice and Photo hidden/removed as requested until implemented
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Capture</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleCapture} disabled={!title.trim() && !content.trim()}>
          <Text style={[styles.saveButtonText, !title.trim() && !content.trim() && styles.saveButtonTextDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Capture Type Selector */}
        <View style={styles.typeSelector}>
          {captureOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.typeOption,
                captureType === option.type && styles.typeOptionActive,
                option.disabled && styles.typeOptionDisabled,
              ]}
              onPress={() => !option.disabled && setCaptureType(option.type)}
              disabled={option.disabled}
            >
              <View style={styles.typeOptionIconWrapper}>
                <Ionicons
                  name={option.icon as any}
                  size={32}
                  color={
                    captureType === option.type
                      ? colors.primary
                      : option.disabled
                        ? colors.textTertiary
                        : colors.textSecondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.typeOptionLabel,
                  captureType === option.type && styles.typeOptionLabelActive,
                  option.disabled && styles.typeOptionLabelDisabled,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.typeOptionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capture Form */}
        {(captureType === 'note' || captureType === 'task') && (
          <View style={styles.form}>
            <TextInput
              style={styles.titleInput}
              placeholder={captureType === 'note' ? 'Note title...' : 'Task title...'}
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <TextInput
              style={styles.contentInput}
              placeholder={captureType === 'note' ? 'Start writing your note...' : 'Add task description...'}
              placeholderTextColor={colors.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Coming Soon Features */}
        {(captureType === 'voice' || captureType === 'photo') && (
          <View style={styles.comingSoonContainer}>
            <Ionicons name="construct-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.comingSoonText}>{captureType === 'voice' ? 'Voice Memo' : 'Photo Capture'}</Text>
            <Text style={styles.comingSoonSubtext}>This feature is coming soon</Text>
            <TouchableOpacity
              style={styles.notifyButton}
              onPress={() => {
                Alert.alert('Noted!', "We'll let you know when this is ready.");
              }}
            >
              <Text style={styles.notifyButtonText}>Notify Me</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              const now = new Date();
              setTitle(title || `${captureType === 'note' ? 'Note' : 'Task'} - ${now.toLocaleDateString()}`);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Add Date to Title</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              setTitle('');
              setContent('');
            }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary,
  },
  saveButtonTextDisabled: {
    color: colors.textTertiary,
  },
  content: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundElevated,
  },
  typeOptionDisabled: {
    opacity: 0.4,
  },
  typeOptionIconWrapper: {
    marginBottom: spacing.xs,
  },
  typeOptionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  typeOptionLabelActive: {
    color: colors.primary,
  },
  typeOptionLabelDisabled: {
    color: colors.textTertiary,
  },
  typeOptionDescription: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textPrimary,
  },
  contentInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    minHeight: 200,
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  comingSoonText: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  comingSoonSubtext: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  notifyButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifyButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
  quickActions: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  quickActionsTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  quickActionText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
});
