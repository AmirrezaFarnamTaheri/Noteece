import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '@/lib/theme';
import { useVaultStore } from '@/store/vault';
import { useAppContext, useUpdateSetting } from '@/store/app-context';
import { useTheme, useThemeColors } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { startBackgroundSync, stopBackgroundSync, triggerManualSync } from '@/lib/sync/background-sync';
import { nfcTriggerManager } from '@/lib/features/nfc-triggers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeVaultPassword } from '@/lib/vault-utils';
import { exportAllData, clearAllData, getDataStats } from '@/lib/data-utils';
import { Logger } from '@/lib/logger';

export default function MoreScreen() {
  const { lockVault } = useVaultStore();
  const settings = useAppContext((state) => state.settings);
  const updateSetting = useUpdateSetting();
  const { themeMode, setThemeMode } = useTheme();
  const colors = useThemeColors();
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleLockVault = () => {
    haptics.warning();
    Alert.alert('Lock Vault', 'Are you sure you want to lock the vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock',
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          lockVault();
          router.replace('/unlock');
        },
      },
    ]);
  };

  const handleToggleBackgroundSync = async (value: boolean) => {
    const previous = backgroundSyncEnabled;
    try {
      haptics.medium();
      // Perform async operations first
      if (value) {
        await startBackgroundSync();
      } else {
        await stopBackgroundSync();
      }
      await AsyncStorage.setItem('background_sync_enabled', value.toString());

      // Only update state after all operations succeed
      setBackgroundSyncEnabled(value);
    } catch (error) {
      Logger.error('Failed to toggle background sync', error);
      haptics.error();
      // Revert to previous state on failure
      setBackgroundSyncEnabled(previous);
      Alert.alert('Error', 'Failed to update background sync setting');
    }
  };

  const handleToggleNFC = async (value: boolean) => {
    try {
      const available = await nfcTriggerManager.isAvailable();

      if (!available && value) {
        haptics.error();
        Alert.alert('NFC Not Available', 'NFC is not available on this device or is disabled in settings');
        return;
      }

      haptics.medium();
      // Persist to storage first
      await AsyncStorage.setItem('nfc_enabled', value.toString());

      // Only update state after storage write succeeds
      setNfcEnabled(value);

      if (value) {
        haptics.success();
        Alert.alert('NFC Enabled', 'You can now use NFC tags to trigger quick actions');
      }
    } catch (error) {
      Logger.error('Failed to toggle NFC', error);
      haptics.error();
      Alert.alert('Error', 'Failed to update NFC setting');
    }
  };

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    haptics.light();
    try {
      const success = await triggerManualSync();
      if (success) {
        haptics.success();
        Alert.alert('Success', 'Sync completed successfully');
      } else {
        haptics.warning();
        Alert.alert('No Devices', 'No devices found to sync with');
      }
    } catch (error) {
      Logger.error('Failed to sync', error);
      haptics.error();
      Alert.alert('Error', 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleChangePassword = () => {
    if (Platform.OS === 'ios') {
      // iOS supports Alert.prompt
      Alert.prompt(
        'Change Vault Password',
        'Enter your current password:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Next',
            onPress: (rawCurrentPassword) => {
              const currentPassword = (rawCurrentPassword ?? '').trim();
              if (!currentPassword) {
                Alert.alert('Error', 'Current password is required');
                return;
              }
              Alert.prompt(
                'New Password',
                'Enter your new password (min 8 characters):',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Next',
                    onPress: (rawNewPassword) => {
                      const newPassword = (rawNewPassword ?? '').trim();
                      if (newPassword.length < 8) {
                        Alert.alert('Error', 'New password must be at least 8 characters');
                        return;
                      }
                      Alert.prompt(
                        'Confirm Password',
                        'Confirm your new password:',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Change',
                            onPress: async (rawConfirmPassword) => {
                              const confirmPassword = (rawConfirmPassword ?? '').trim();
                              if (newPassword !== confirmPassword) {
                                Alert.alert('Error', 'Passwords do not match');
                                return;
                              }
                              try {
                                const result = await changeVaultPassword(currentPassword, newPassword);
                                if (result.success) {
                                  // Lock vault to clear DEK from memory (security best practice)
                                  lockVault();
                                  Alert.alert(
                                    'Password Changed',
                                    'Your vault password has been changed successfully.\n\n' +
                                      'For security, the vault has been locked. Please unlock with your NEW password.\n\n' +
                                      'Note: Biometric unlock has been disabled and must be re-enabled.',
                                    [
                                      {
                                        text: 'OK',
                                        onPress: () => {
                                          router.replace('/unlock');
                                        },
                                      },
                                    ],
                                  );
                                } else {
                                  Alert.alert('Error', result.error || 'Failed to change password');
                                }
                              } catch (error) {
                                Logger.error('Change password failed', error);
                                Alert.alert('Error', 'Failed to change password. Please try again.');
                              }
                            },
                          },
                        ],
                        'secure-text',
                      );
                    },
                  },
                ],
                'secure-text',
              );
            },
          },
        ],
        'secure-text',
      );
    } else {
      // Android doesn't support Alert.prompt
      Alert.alert(
        'Change Password',
        'Password change is currently only available on iOS. For Android, please use the web app or reinstall to create a new vault.',
        [{ text: 'OK' }],
      );
    }
  };

  const handleExportData = async () => {
    try {
      // Get stats first
      const stats = await getDataStats();

      haptics.warning();
      Alert.alert(
        '⚠️ Export Data (Unencrypted)',
        `SECURITY WARNING: Exported data is UNENCRYPTED!\n\n` +
          `Export ${stats.total} items?\n` +
          `• ${stats.tasks} tasks\n` +
          `• ${stats.notes} notes\n` +
          `• ${stats.timeEntries} time entries\n` +
          `• ${stats.healthMetrics} health metrics\n` +
          `• ${stats.calendarEvents} calendar events\n\n` +
          '⚠️ The exported JSON file will contain your data in PLAIN TEXT.\n\n' +
          '• Store it securely\n' +
          '• Delete after use\n' +
          '• DO NOT upload to cloud services\n' +
          '• DO NOT share via unsecured channels',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Understand, Export',
            style: 'destructive',
            onPress: async () => {
              haptics.heavy();
              const result = await exportAllData();
              if (result.success) {
                haptics.success();
                Alert.alert(
                  'Export Complete',
                  '⚠️ REMINDER: This file contains UNENCRYPTED data.\n\nStore it securely and delete after use.',
                  [{ text: 'OK' }],
                );
              } else {
                haptics.error();
                Alert.alert('Error', result.error || 'Failed to export data');
              }
            },
          },
        ],
      );
    } catch (error) {
      Logger.error('Failed to export data', error);
      haptics.error();
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  const handleClearAllData = async () => {
    try {
      // Get stats first
      const stats = await getDataStats();

      haptics.warning();
      Alert.alert(
        'Clear All Data',
        `This will permanently delete all your local data:\n\n` +
          `• ${stats.tasks} tasks\n` +
          `• ${stats.notes} notes\n` +
          `• ${stats.timeEntries} time entries\n` +
          `• ${stats.healthMetrics} health metrics\n` +
          `• ${stats.calendarEvents} calendar events\n\n` +
          'This action cannot be undone!\n\n' +
          'Consider exporting your data first.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Everything',
            style: 'destructive',
            onPress: () => {
              haptics.error();
              Alert.alert(
                'Are You Sure?',
                'This will delete EVERYTHING and you will be logged out. This cannot be undone!',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Yes, Delete All',
                    style: 'destructive',
                    onPress: async () => {
                      haptics.heavy();
                      const result = await clearAllData();
                      if (result.success) {
                        haptics.success();
                        Alert.alert(
                          'Data Cleared',
                          'All data has been deleted. You will now be returned to onboarding.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                lockVault();
                                router.replace('/onboarding');
                              },
                            },
                          ],
                        );
                      } else {
                        haptics.error();
                        Alert.alert('Error', result.error || 'Failed to clear data');
                      }
                    },
                  },
                ],
              );
            },
          },
        ],
      );
    } catch (error) {
      Logger.error('Failed to clear data', error);
      haptics.error();
      Alert.alert('Error', 'Failed to clear data. Please try again.');
    }
  };

  const handleThemeModeChange = () => {
    haptics.light();
    Alert.alert('Theme Mode', 'Choose your preferred theme', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Light',
        onPress: () => {
          haptics.selection();
          setThemeMode('light');
        },
      },
      {
        text: 'Dark',
        onPress: () => {
          haptics.selection();
          setThemeMode('dark');
        },
      },
      {
        text: 'Auto (System)',
        onPress: () => {
          haptics.selection();
          setThemeMode('auto');
        },
      },
    ]);
  };

  const handleFontSizeChange = () => {
    haptics.light();
    Alert.alert('Font Size', 'Choose your preferred font size', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Small',
        onPress: () => {
          haptics.selection();
          updateSetting('theme', { ...settings.theme, fontSize: 'small' });
        },
      },
      {
        text: 'Medium',
        onPress: () => {
          haptics.selection();
          updateSetting('theme', { ...settings.theme, fontSize: 'medium' });
        },
      },
      {
        text: 'Large',
        onPress: () => {
          haptics.selection();
          updateSetting('theme', { ...settings.theme, fontSize: 'large' });
        },
      },
    ]);
  };

  const handleFontFamilyChange = () => {
    haptics.light();
    Alert.alert('Font Family', 'Choose your preferred font', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Default',
        onPress: () => {
          haptics.selection();
          updateSetting('theme', { ...settings.theme, fontFamily: 'default' });
        },
      },
      {
        text: 'Dyslexic-Friendly',
        onPress: () => {
          haptics.selection();
          updateSetting('theme', { ...settings.theme, fontFamily: 'dyslexic' });
        },
      },
      {
        text: 'Monospace',
        onPress: () => {
          haptics.selection();
          updateSetting('theme', {
            ...settings.theme,
            fontFamily: 'monospace',
          });
        },
      },
    ]);
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      haptics.medium();
      await updateSetting('notifications', value);
    } catch (error) {
      Logger.error('Failed to toggle notifications', error);
      haptics.error();
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleToggleHaptics = async (value: boolean) => {
    try {
      // Provide immediate feedback before the setting takes effect
      if (value) {
        haptics.medium();
      }
      await updateSetting('haptics', value);
    } catch (error) {
      Logger.error('Failed to toggle haptics', error);
      haptics.error();
      Alert.alert('Error', 'Failed to update haptic settings');
    }
  };

  const getThemeModeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto (System)';
      default:
        return 'Auto (System)';
    }
  };

  const getFontSizeLabel = () => {
    return settings.theme.fontSize.charAt(0).toUpperCase() + settings.theme.fontSize.slice(1);
  };

  const getFontFamilyLabel = () => {
    switch (settings.theme.fontFamily) {
      case 'default':
        return 'Default';
      case 'dyslexic':
        return 'Dyslexic-Friendly';
      case 'monospace':
        return 'Monospace';
      default:
        return 'Default';
    }
  };

  const settingsSections = [
    {
      title: 'General',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          subtitle: 'Push notifications and alerts',
          toggle: true,
          value: settings.notifications,
          onToggle: handleToggleNotifications,
        },
        {
          icon: 'phone-portrait-outline',
          label: 'Haptic Feedback',
          subtitle: 'Vibration on interactions',
          toggle: true,
          value: settings.haptics,
          onToggle: handleToggleHaptics,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: 'color-palette-outline',
          label: 'Theme Mode',
          subtitle: getThemeModeLabel(),
          onPress: handleThemeModeChange,
          showChevron: true,
        },
        {
          icon: 'text-outline',
          label: 'Font Size',
          subtitle: getFontSizeLabel(),
          onPress: handleFontSizeChange,
          showChevron: true,
        },
        {
          icon: 'list-outline',
          label: 'Font Family',
          subtitle: getFontFamilyLabel(),
          onPress: handleFontFamilyChange,
          showChevron: true,
        },
      ],
    },
    {
      title: 'Sync & Backup',
      items: [
        {
          icon: 'sync-outline',
          label: 'Manual Sync',
          subtitle: 'Sync with devices on local network',
          onPress: handleManualSync,
          showChevron: true,
        },
        {
          icon: 'cloud-upload-outline',
          label: 'Background Sync',
          subtitle: 'Auto-sync every 15 minutes',
          toggle: true,
          value: backgroundSyncEnabled,
          onToggle: handleToggleBackgroundSync,
        },
      ],
    },
    {
      title: 'Features',
      items: [
        {
          icon: 'hardware-chip-outline',
          label: 'NFC Triggers',
          subtitle: 'Use NFC tags for quick actions',
          toggle: true,
          value: nfcEnabled,
          onToggle: handleToggleNFC,
        },
        {
          icon: 'location-outline',
          label: 'Location Reminders',
          subtitle: 'Geofence-based task reminders',
          onPress: () => {
            Alert.alert(
              'Location Reminders',
              'Location-based reminders allow you to get notified when you arrive at or leave specific locations.\n\n' +
                'This feature uses geofencing to trigger task reminders based on your location. ' +
                'Currently configured in task creation screen.',
              [{ text: 'Got it' }],
            );
          },
          showChevron: true,
        },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        {
          icon: 'lock-closed-outline',
          label: 'Change Vault Password',
          onPress: handleChangePassword,
          showChevron: true,
        },
        {
          icon: 'download-outline',
          label: 'Export Data',
          subtitle: 'Export all your data',
          onPress: handleExportData,
          showChevron: true,
        },
        {
          icon: 'trash-outline',
          label: 'Clear All Data',
          subtitle: 'Delete all local data',
          onPress: handleClearAllData,
          showChevron: true,
          destructive: true,
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Version',
          subtitle: '1.0.0',
        },
        {
          icon: 'document-text-outline',
          label: 'Documentation',
          onPress: () => {
            Alert.alert('Documentation', 'View the full documentation at noteece.com');
          },
          showChevron: true,
        },
        {
          icon: 'heart-outline',
          label: 'Open Source',
          subtitle: 'Built with ❤️ as open source',
          onPress: () => {
            Alert.alert('Open Source', 'Noteece is open source on GitHub');
          },
          showChevron: true,
        },
      ],
    },
  ];

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
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    userAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: typography.fontSize.lg,
      fontFamily: typography.fontFamily.semibold,
      color: colors.text,
    },
    userEmail: {
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    lockButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.error}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.semibold,
      color: colors.textTertiary,
      marginBottom: spacing.sm,
      paddingLeft: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionItems: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    settingItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingIconDestructive: {
      backgroundColor: `${colors.error}10`,
    },
    settingItemText: {
      flex: 1,
    },
    settingLabel: {
      fontSize: typography.fontSize.base,
      fontFamily: typography.fontFamily.medium,
      color: colors.text,
    },
    settingLabelDestructive: {
      color: colors.error,
    },
    settingSubtitle: {
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Noteece User</Text>
            <Text style={styles.userEmail}>Encrypted vault active</Text>
          </View>
          <TouchableOpacity style={styles.lockButton} onPress={handleLockVault}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.settingItem, itemIndex !== section.items.length - 1 && styles.settingItemBorder]}
                  onPress={'toggle' in item ? undefined : item.onPress}
                  disabled={!('onPress' in item) && !('toggle' in item)}
                  activeOpacity={'toggle' in item ? 1 : 0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <View
                      style={[
                        styles.settingIcon,
                        'destructive' in item && item.destructive && styles.settingIconDestructive,
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={'destructive' in item && item.destructive ? colors.error : colors.primary}
                      />
                    </View>
                    <View style={styles.settingItemText}>
                      <Text
                        style={[
                          styles.settingLabel,
                          'destructive' in item && item.destructive && styles.settingLabelDestructive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
                    </View>
                  </View>

                  {'toggle' in item && item.toggle ? (
                    <Switch
                      value={'value' in item ? item.value : false}
                      onValueChange={'onToggle' in item ? item.onToggle : undefined}
                      trackColor={{
                        false: colors.surface,
                        true: colors.primary,
                      }}
                      thumbColor={colors.text}
                    />
                  ) : 'showChevron' in item && item.showChevron ? (
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
