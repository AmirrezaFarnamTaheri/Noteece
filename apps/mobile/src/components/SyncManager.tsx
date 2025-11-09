import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { invoke } from '@tauri-apps/api/core';

interface SyncStatus {
  status: 'idle' | 'discovering' | 'connecting' | 'syncing' | 'complete' | 'error';
  message: string;
  progress: number;
  connected_device?: string;
  last_sync?: string;
  error?: string;
}

interface DiscoveredDevice {
  device_id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  port: number;
}

const SyncManager: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    message: 'Ready to sync',
    progress: 0,
  });
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    // Auto-discover devices on component mount
    discoverDevices();
  }, []);

  const discoverDevices = async () => {
    try {
      setIsScanning(true);
      setSyncStatus({
        status: 'discovering',
        message: 'Discovering nearby devices...',
        progress: 0,
      });

      // Call Tauri command to discover devices
      const devices = await invoke<DiscoveredDevice[]>('discover_devices_cmd');

      setDiscoveredDevices(devices || []);
      setSyncStatus({
        status: 'idle',
        message: devices && devices.length > 0
          ? `Found ${devices.length} device(s)`
          : 'No devices found',
        progress: 0,
      });
    } catch (error) {
      setSyncStatus({
        status: 'error',
        message: 'Discovery failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const initiateSync = async (deviceId: string) => {
    try {
      setSelectedDevice(deviceId);
      setSyncStatus({
        status: 'connecting',
        message: 'Connecting to device...',
        progress: 10,
      });

      // Step 1: Initiate pairing
      const pairingInitiated = await invoke<boolean>('initiate_pairing_cmd', {
        device_id: deviceId,
      });

      if (!pairingInitiated) {
        throw new Error('Failed to initiate pairing');
      }

      setSyncStatus({
        status: 'connecting',
        message: 'Exchanging keys...',
        progress: 30,
      });

      // Step 2: Exchange keys (ECDH)
      const keysExchanged = await invoke<boolean>('exchange_keys_cmd', {
        device_id: deviceId,
      });

      if (!keysExchanged) {
        throw new Error('Key exchange failed');
      }

      setSyncStatus({
        status: 'syncing',
        message: 'Syncing data...',
        progress: 50,
        connected_device: deviceId,
      });

      // Step 3: Start sync
      const syncStarted = await invoke<boolean>('start_sync_cmd', {
        device_id: deviceId,
        categories: ['posts', 'accounts', 'categories'],
      });

      if (!syncStarted) {
        throw new Error('Failed to start sync');
      }

      // Monitor sync progress
      await monitorSyncProgress(deviceId);

      setSyncStatus({
        status: 'complete',
        message: 'Sync completed successfully',
        progress: 100,
        last_sync: new Date().toISOString(),
        connected_device: deviceId,
      });

      Alert.alert('Success', 'Data synchronized successfully');
    } catch (error) {
      setSyncStatus({
        status: 'error',
        message: 'Sync failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      Alert.alert('Sync Error', error instanceof Error ? error.message : 'Sync failed');
    }
  };

  const monitorSyncProgress = async (deviceId: string) => {
    // Poll for sync progress updates
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds

    while (attempts < maxAttempts) {
      try {
        const progress = await invoke<{ progress: number; message: string }>(
          'get_sync_progress_cmd',
          { device_id: deviceId }
        );

        setSyncStatus((prev) => ({
          ...prev,
          progress: 50 + (progress.progress * 0.5), // Scale from 50-100
          message: progress.message,
        }));

        if (progress.progress >= 100) {
          break;
        }

        // Wait 1 second before next check
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error monitoring sync progress:', error);
        break;
      }
    }
  };

  const cancelSync = async () => {
    try {
      if (selectedDevice) {
        await invoke('cancel_sync_cmd', { device_id: selectedDevice });
      }
      setSyncStatus({
        status: 'idle',
        message: 'Sync cancelled',
        progress: 0,
      });
      setSelectedDevice(null);
    } catch (error) {
      console.error('Error cancelling sync:', error);
    }
  };

  const retryDiscovery = () => {
    discoveryDevices();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Sync Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Sync Status</Text>
          <Text style={[styles.statusBadge, styles[`badge_${syncStatus.status}`]]}>
            {syncStatus.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.statusMessage}>{syncStatus.message}</Text>

        {syncStatus.error && (
          <Text style={styles.errorText}>Error: {syncStatus.error}</Text>
        )}

        {syncStatus.last_sync && (
          <Text style={styles.lastSyncText}>
            Last sync: {new Date(syncStatus.last_sync).toLocaleString()}
          </Text>
        )}

        {/* Progress Bar */}
        {syncStatus.status !== 'idle' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${syncStatus.progress}%` }]} />
          </View>
        )}
        <Text style={styles.progressText}>{syncStatus.progress.toFixed(0)}%</Text>
      </View>

      {/* Discovery Controls */}
      <View style={styles.controlsCard}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={discoverDevices}
          disabled={isScanning || syncStatus.status !== 'idle'}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>
              {discoveredDevices.length > 0 ? 'Re-scan' : 'Scan'} Devices
            </Text>
          )}
        </TouchableOpacity>

        {syncStatus.status === 'syncing' && (
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={cancelSync}
          >
            <Text style={styles.buttonText}>Cancel Sync</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Available Devices */}
      {discoveredDevices.length > 0 ? (
        <View style={styles.devicesCard}>
          <Text style={styles.sectionTitle}>Available Devices ({discoveredDevices.length})</Text>

          {discoveredDevices.map((device) => (
            <TouchableOpacity
              key={device.device_id}
              style={[
                styles.deviceItem,
                selectedDevice === device.device_id && styles.deviceItemSelected,
              ]}
              onPress={() => initiateSync(device.device_id)}
              disabled={syncStatus.status !== 'idle'}
            >
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.device_name}</Text>
                <Text style={styles.deviceSubtext}>
                  {device.device_type} • {device.ip_address}:{device.port}
                </Text>
              </View>
              <View style={styles.deviceStatus}>
                {selectedDevice === device.device_id && syncStatus.status !== 'idle' && (
                  <ActivityIndicator color="#667eea" size="small" />
                )}
                <Text style={styles.syncChevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : isScanning ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.emptyStateText}>Scanning for devices...</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No devices found</Text>
          <Text style={styles.emptyStateSubtext}>
            Make sure your desktop is on the same network and Noteece is running
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={retryDiscovery}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sync Information */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>1. Scan</Text>
          <Text style={styles.infoText}>
            Discover nearby Noteece devices on your local network
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>2. Connect</Text>
          <Text style={styles.infoText}>
            Secure connection using ECDH key exchange
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>3. Sync</Text>
          <Text style={styles.infoText}>
            Synchronize data using vector clocks for consistency
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  badge_idle: { backgroundColor: '#999' },
  badge_discovering: { backgroundColor: '#2196F3' },
  badge_connecting: { backgroundColor: '#FF9800' },
  badge_syncing: { backgroundColor: '#4CAF50' },
  badge_complete: { backgroundColor: '#4CAF50' },
  badge_error: { backgroundColor: '#F44336' },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 8,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  controlsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  secondaryButton: {
    backgroundColor: '#e0e0e0',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  devicesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceItemSelected: {
    backgroundColor: '#f9f9ff',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceSubtext: {
    fontSize: 12,
    color: '#999',
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncChevron: {
    fontSize: 18,
    color: '#ccc',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoBullet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});

export default SyncManager;
