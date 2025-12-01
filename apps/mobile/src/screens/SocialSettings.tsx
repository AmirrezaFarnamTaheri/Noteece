/**
 * SocialSettings Screen
 *
 * Settings and preferences for the social media suite:
 * - Sync settings
 * - Notification preferences
 * - Data management
 * - Account management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';
import * as TaskManager from 'expo-task-manager';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  isBiometricAvailable,
  isSocialBiometricEnabled,
  enableSocialBiometric,
  disableSocialBiometric,
  getSupportedBiometricTypes,
} from '../lib/social-security';
import { startBackgroundSync, stopBackgroundSync, triggerManualSync } from '../lib/sync/background-sync';
import { useCurrentSpace } from '../store/app-context';
import { dbQuery } from '../lib/database';

interface SettingsItem {
  key: string;
  title: string;
  subtitle?: string;
  type: 'switch' | 'button' | 'navigation';
  value?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  onChange?: (value: boolean) => void;
}

/**
 * Format last sync time as relative time
 */
function formatLastSync(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

export function SocialSettings() {
  // Get current space
  const spaceId = useCurrentSpace();

  // Settings state
  const [autoSync, setAutoSync] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [backgroundSync, setBackgroundSync] = useState(false);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load biometric status
    const bioAvailable = await isBiometricAvailable();
    const bioEnabled = await isSocialBiometricEnabled();
    const types = await getSupportedBiometricTypes();
    setBiometricAvailable(bioAvailable);
    setBiometricEnabled(bioEnabled);
    setBiometricTypes(types);

    // Load background sync status
    const isRegistered = await TaskManager.isTaskRegisteredAsync('background-sync-task');
    setBackgroundSync(isRegistered);

    // Load last sync time
    const lastSync = await AsyncStorage.getItem('social_last_sync');
    if (lastSync) {
      setLastSyncTime(lastSync);
    }
  };

  const handleToggleBackgroundSync = async (value: boolean) => {
    if (value) {
      // Enable background sync
      await startBackgroundSync();
      setBackgroundSync(true);
      Alert.alert(
        'Background Sync Enabled',
        'Social data will sync automatically every 15 minutes when connected to a desktop app.',
        [{ text: 'OK' }],
      );
    } else {
      // Disable background sync
      Alert.alert('Disable Background Sync?', 'Automatic syncing will be disabled. You can still sync manually.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          onPress: async () => {
            await stopBackgroundSync();
            setBackgroundSync(false);
          },
        },
      ]);
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;

    setIsSyncing(true);

    try {
      const success = await triggerManualSync();

      if (success) {
        const now = new Date().toISOString();
        await AsyncStorage.setItem('social_last_sync', now);
        setLastSyncTime(now);
        Alert.alert('Sync Complete', 'Social data has been synchronized successfully.');
      } else {
        Alert.alert(
          'Sync Failed',
          'Could not find a desktop app on the local network. Make sure your desktop app is running and connected to the same WiFi network.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', 'Failed to synchronize. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device or no biometric data is enrolled.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (value) {
      // Enabling biometric lock
      const success = await enableSocialBiometric();
      if (success) {
        setBiometricEnabled(true);
        const typesText = biometricTypes.join(' or ');
        Alert.alert('Biometric Lock Enabled', `Social Hub will now require ${typesText} authentication to access.`, [
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Error', 'Failed to enable biometric lock', [{ text: 'OK' }]);
      }
    } else {
      // Disabling biometric lock
      Alert.alert('Disable Biometric Lock?', 'Social Hub will be accessible without biometric authentication.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            const success = await disableSocialBiometric();
            if (success) {
              setBiometricEnabled(false);
            } else {
              Alert.alert('Error', 'Failed to disable biometric lock', [{ text: 'OK' }]);
            }
          },
        },
      ]);
    }
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will remove all cached data and force a full resync. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear cached data
            await AsyncStorage.removeItem('social_last_sync');
            Alert.alert('Success', 'Cache cleared successfully');
          } catch {
            Alert.alert('Error', 'Failed to clear cache');
          }
        },
      },
    ]);
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      // Query all social data
      const [posts, categories, accounts, focusModes] = await Promise.all([
        dbQuery('SELECT * FROM social_post WHERE space_id = ?', [spaceId]),
        dbQuery('SELECT * FROM social_category WHERE space_id = ?', [spaceId]),
        dbQuery('SELECT * FROM social_account WHERE space_id = ?', [spaceId]),
        dbQuery('SELECT * FROM social_focus_mode WHERE space_id = ?', [spaceId]),
      ]);

      // Create export data
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        spaceId,
        data: {
          posts,
          categories,
          accounts,
          focusModes,
        },
        metadata: {
          postsCount: posts.length,
          categoriesCount: categories.length,
          accountsCount: accounts.length,
          focusModesCount: focusModes.length,
        },
      };

      // Create file
      const fileName = `noteece_social_export_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Social Data',
          UTI: 'public.json',
        });

        Alert.alert(
          'Export Complete',
          `Exported ${posts.length} posts, ${categories.length} categories, and ${accounts.length} accounts.`,
        );
      } else {
        Alert.alert('Export Complete', `Data saved to ${fileName}. Sharing not available on this device.`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const settings: SettingsItem[] = [
    {
      key: 'autoSync',
      title: 'Auto Sync',
      subtitle: 'Automatically sync when connected to desktop',
      type: 'switch',
      icon: 'sync',
      value: autoSync,
      onChange: setAutoSync,
    },
    {
      key: 'wifiOnly',
      title: 'WiFi Only',
      subtitle: 'Only sync over WiFi connections',
      type: 'switch',
      icon: 'wifi',
      value: wifiOnly,
      onChange: setWifiOnly,
    },
    {
      key: 'backgroundSync',
      title: 'Background Sync',
      subtitle: 'Sync data in the background every 15 minutes (battery impact)',
      type: 'switch',
      icon: 'refresh',
      value: backgroundSync,
      onChange: handleToggleBackgroundSync,
    },
    {
      key: 'notifications',
      title: 'Notifications',
      subtitle: 'Show notifications for new posts and sync status',
      type: 'switch',
      icon: 'notifications',
      value: notifications,
      onChange: setNotifications,
    },
  ];

  const securitySettings: SettingsItem[] = [
    {
      key: 'biometricLock',
      title: 'Biometric Lock',
      subtitle: biometricAvailable
        ? `Require ${biometricTypes.join(' or ')} to access Social Hub`
        : 'Biometric authentication not available',
      type: 'switch',
      icon: 'finger-print',
      value: biometricEnabled,
      onChange: handleToggleBiometric,
    },
  ];

  const dataManagement: SettingsItem[] = [
    {
      key: 'clearCache',
      title: 'Clear Cache',
      subtitle: 'Remove cached data and force full resync',
      type: 'button',
      icon: 'trash',
      onPress: handleClearCache,
    },
    {
      key: 'exportData',
      title: isExporting ? 'Exporting...' : 'Export Data',
      subtitle: isExporting ? 'Creating export file...' : 'Export your social media data to JSON',
      type: 'button',
      icon: 'download',
      onPress: isExporting ? undefined : handleExportData,
    },
  ];

  const renderSettingItem = (item: SettingsItem) => {
    return (
      <TouchableOpacity
        key={item.key}
        style={styles.settingItem}
        onPress={item.onPress}
        disabled={item.type === 'switch'}
        activeOpacity={item.type === 'button' ? 0.7 : 1}
      >
        <View style={styles.settingLeft}>
          {item.icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={20} color="#007AFF" />
            </View>
          )}
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
          </View>
        </View>
        <View style={styles.settingRight}>
          {item.type === 'switch' && item.onChange && (
            <Switch
              value={item.value}
              onValueChange={item.onChange}
              trackColor={{ false: '#D1D1D6', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          )}
          {item.type === 'button' && <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Settings</Text>
        <Text style={styles.headerSubtitle}>Manage sync and notification preferences</Text>
      </View>

      {/* Sync Status Card */}
      <View style={styles.card}>
        <View style={styles.statusHeader}>
          <Ionicons name={isSyncing ? 'sync' : 'cloud-done'} size={24} color={isSyncing ? '#007AFF' : '#34C759'} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>{isSyncing ? 'Syncing...' : 'Sync Status'}</Text>
            <Text style={styles.statusSubtitle}>
              {lastSyncTime ? `Last synced: ${formatLastSync(lastSyncTime)}` : 'Not synced yet'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSyncNow}
          disabled={isSyncing}
        >
          <Ionicons name="sync" size={18} color="#FFF" />
          <Text style={styles.syncButtonText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SYNC SETTINGS</Text>
        <View style={styles.card}>
          {settings.map((item, index) => (
            <View key={item.key}>
              {renderSettingItem(item)}
              {index < settings.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      </View>

      {/* Security */}
      {biometricAvailable && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY</Text>
          <View style={styles.card}>
            {securitySettings.map((item, index) => (
              <View key={item.key}>
                {renderSettingItem(item)}
                {index < securitySettings.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
        <View style={styles.card}>
          {dataManagement.map((item, index) => (
            <View key={item.key}>
              {renderSettingItem(item)}
              {index < dataManagement.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Social Sync</Text>
        <Text style={styles.infoText}>
          Social data is synced from your desktop app over a secure local connection. Your data never leaves your
          devices and is encrypted end-to-end.
        </Text>
        <View style={styles.infoStats}>
          <View style={styles.infoStat}>
            <Text style={styles.infoStatValue}>0 MB</Text>
            <Text style={styles.infoStatLabel}>Local Storage</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoStat}>
            <Text style={styles.infoStatValue}>0</Text>
            <Text style={styles.infoStatLabel}>Synced Posts</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoStat}>
            <Text style={styles.infoStatValue}>0</Text>
            <Text style={styles.infoStatLabel}>Accounts</Text>
          </View>
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  settingRight: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 60,
  },
  infoSection: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  infoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  infoStat: {
    alignItems: 'center',
  },
  infoStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  infoStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  infoDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
  },
  bottomPadding: {
    height: 40,
  },
});
