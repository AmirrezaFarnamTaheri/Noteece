/**
 * Sync Types
 */

export interface SyncDevice {
  id: string;
  name: string;
  device_type: string;
  last_seen: number;
  status: 'online' | 'offline' | 'syncing';
  ip_address?: string;
  sync_progress?: number;
}

export interface SyncConflict {
  id: string;
  entity_type: string;
  entity_id: string;
  local_version: number;
  remote_version: number;
  conflict_data: string;
  created_at: number;
  resolved_at?: number;
  resolution?: 'local' | 'remote' | 'merged';
}

export interface SyncHistoryEntry {
  id: string;
  device_id: string;
  device_name: string;
  direction: 'push' | 'pull';
  entities_synced: number;
  started_at: number;
  completed_at: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

export interface SyncStats {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  last_sync: number | null;
  entities_synced_today: number;
  avg_sync_duration: number;
}

export const deviceTypeIcons: Record<string, string> = {
  desktop: 'IconDeviceDesktop',
  mobile: 'IconDeviceMobile',
  tablet: 'IconDeviceTablet',
  web: 'IconBrowser',
};

export const statusColors: Record<string, string> = {
  online: 'green',
  offline: 'gray',
  syncing: 'blue',
  success: 'green',
  partial: 'yellow',
  failed: 'red',
};

