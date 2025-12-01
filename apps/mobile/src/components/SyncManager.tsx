import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SyncClient, SyncStatus } from '../lib/sync/sync-client';
import { DiscoveredDevice } from '../lib/sync/sync-bridge';

const SyncManager: React.FC = () => {
  const [syncClient] = useState(() => new SyncClient('mobile-device-id'));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    message: 'Ready to sync',
    active: false,
    progress: 0,
  });
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const updateStatus = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSyncStatus(syncClient.getSyncStatus() as any);
  }, [syncClient]);

  const discoverDevices = useCallback(async () => {
    try {
      setIsScanning(true);
      const devices = await syncClient.discoverDevices();
      setDiscoveredDevices(devices.map((d) => ({ ...d, protocol: 'typescript' })));
    } catch (error) {
      Alert.alert('Discovery Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  }, [syncClient]);

  useEffect(() => {
    discoverDevices();
    const interval = setInterval(updateStatus, 1000); // Poll for status updates
    return () => clearInterval(interval);
  }, [updateStatus, discoverDevices]);

  const initiateSync = async (deviceId: string) => {
    try {
      setSelectedDevice(deviceId);
      const device = discoveredDevices.find((d) => d.device_id === deviceId);
      if (device) {
        await syncClient.initiateSync(deviceId, device.ip_address, device.port);
      } else {
        throw new Error('Device not found');
      }
    } catch (error) {
      Alert.alert('Sync Error', error instanceof Error ? error.message : 'Sync failed');
    }
  };

  const cancelSync = () => {
    syncClient.cancelSync();
    setSelectedDevice(null);
  };

  return (
    <ScrollView style={styles.container}>
      {/* UI remains the same */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Sync Status</Text>
          <Text style={[styles.statusBadge, styles[`badge_${syncStatus.status}`]]}>
            {syncStatus.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.statusMessage}>{syncStatus.message}</Text>

        {syncStatus.error && <Text style={styles.errorText}>Error: {syncStatus.error}</Text>}

        {syncStatus.last_sync && (
          <Text style={styles.lastSyncText}>Last sync: {new Date(syncStatus.last_sync).toLocaleString()}</Text>
        )}

        {syncStatus.status !== 'idle' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${syncStatus.progress}%` }]} />
          </View>
        )}
        <Text style={styles.progressText}>{syncStatus.progress.toFixed(0)}%</Text>
      </View>

      <View style={styles.controlsCard}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={discoverDevices}
          disabled={isScanning || syncStatus.status !== 'idle'}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{discoveredDevices.length > 0 ? 'Re-scan' : 'Scan'} Devices</Text>
          )}
        </TouchableOpacity>

        {syncStatus.status === 'syncing' && (
          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={cancelSync}>
            <Text style={styles.buttonText}>Cancel Sync</Text>
          </TouchableOpacity>
        )}
      </View>

      {discoveredDevices.length > 0 ? (
        <View style={styles.devicesCard}>
          <Text style={styles.sectionTitle}>Available Devices ({discoveredDevices.length})</Text>

          {discoveredDevices.map((device) => (
            <TouchableOpacity
              key={device.device_id}
              style={[styles.deviceItem, selectedDevice === device.device_id && styles.deviceItemSelected]}
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
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={discoverDevices}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
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
