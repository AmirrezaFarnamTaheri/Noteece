/**
 * Global App Context
 *
 * Centralized state management for app-wide settings and data.
 * Uses Zustand for simple, performant state management.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticManager } from '@/lib/haptics';
import { Logger } from '@/lib/logger';
import { safeJsonParse } from '@/lib/safe-json';

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'default' | 'dyslexic' | 'monospace';
}

export interface AppSettings {
  // General
  language: string;
  notifications: boolean;
  haptics: boolean;

  // Theme
  theme: ThemeConfig;

  // Privacy
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;

  // Social
  socialBiometricEnabled: boolean;
  socialAutoSync: boolean;
  socialWifiOnly: boolean;
  socialBackgroundSync: boolean;

  // Productivity
  focusModeEnabled: boolean;
  pomodoroLength: number;
  breakLength: number;

  // Data
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface UserSpace {
  id: string;
  name: string;
  createdAt: number;
  lastSyncedAt: number | null;
}

interface AppState {
  // Current space
  currentSpaceId: string;
  spaces: UserSpace[];

  // Settings
  settings: AppSettings;

  // UI State
  isOnboarded: boolean;
  lastActiveTab: string | null;

  // Actions
  setCurrentSpace: (spaceId: string) => Promise<void>;
  createSpace: (name: string) => Promise<UserSpace>;
  deleteSpace: (spaceId: string) => Promise<void>;

  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;

  setOnboarded: (value: boolean) => Promise<void>;
  setLastActiveTab: (tab: string) => void;

  // Initialization
  initialize: () => Promise<void>;
}

const DEFAULT_THEME: ThemeConfig = {
  mode: 'dark',
  primaryColor: '#6366F1',
  accentColor: '#8B5CF6',
  fontSize: 'medium',
  fontFamily: 'default',
};

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  notifications: true,
  haptics: true,
  theme: DEFAULT_THEME,
  analyticsEnabled: true,
  crashReportingEnabled: true,
  socialBiometricEnabled: false,
  socialAutoSync: true,
  socialWifiOnly: true,
  socialBackgroundSync: false,
  focusModeEnabled: false,
  pomodoroLength: 25,
  breakLength: 5,
  autoBackup: false,
  backupFrequency: 'weekly',
};

export const useAppContext = create<AppState>((set, get) => ({
  currentSpaceId: 'default',
  spaces: [
    {
      id: 'default',
      name: 'My Space',
      createdAt: Date.now(),
      lastSyncedAt: null,
    },
  ],
  settings: DEFAULT_SETTINGS,
  isOnboarded: false,
  lastActiveTab: null,

  setCurrentSpace: async (spaceId: string) => {
    const { spaces } = get();
    const space = spaces.find((s) => s.id === spaceId);

    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    set({ currentSpaceId: spaceId });
    await AsyncStorage.setItem('current_space_id', spaceId);
  },

  createSpace: async (name: string) => {
    const newSpace: UserSpace = {
      id: `space_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      createdAt: Date.now(),
      lastSyncedAt: null,
    };

    const { spaces } = get();
    const updatedSpaces = [...spaces, newSpace];

    set({ spaces: updatedSpaces });
    await AsyncStorage.setItem('user_spaces', JSON.stringify(updatedSpaces));

    return newSpace;
  },

  deleteSpace: async (spaceId: string) => {
    const { spaces, currentSpaceId } = get();

    if (spaceId === 'default') {
      throw new Error('Cannot delete default space');
    }

    const updatedSpaces = spaces.filter((s) => s.id !== spaceId);
    set({ spaces: updatedSpaces });

    await AsyncStorage.setItem('user_spaces', JSON.stringify(updatedSpaces));

    // If deleting current space, switch to default
    if (currentSpaceId === spaceId) {
      await get().setCurrentSpace('default');
    }
  },

  updateSettings: async (newSettings: Partial<AppSettings>) => {
    const { settings } = get();
    const updatedSettings = { ...settings, ...newSettings };

    set({ settings: updatedSettings });
    await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));

    // Update haptic manager if haptics setting changed
    if ('haptics' in newSettings && newSettings.haptics !== undefined) {
      hapticManager.setEnabled(newSettings.haptics);
    }
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem('app_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        set({ settings: { ...DEFAULT_SETTINGS, ...settings } });

        // Update haptic manager with loaded settings
        hapticManager.setEnabled(settings.haptics !== false);
      }
    } catch (error) {
      Logger.error('[AppContext] Failed to load settings:', error);
    }
  },

  setOnboarded: async (value: boolean) => {
    set({ isOnboarded: value });
    await AsyncStorage.setItem('is_onboarded', value.toString());
  },

  setLastActiveTab: (tab: string) => {
    set({ lastActiveTab: tab });
    AsyncStorage.setItem('last_active_tab', tab);
  },

  initialize: async () => {
    try {
      // Load onboarded status
      const onboarded = await AsyncStorage.getItem('is_onboarded');
      if (onboarded) {
        set({ isOnboarded: onboarded === 'true' });
      }

      // Load current space
      const currentSpace = await AsyncStorage.getItem('current_space_id');
      if (currentSpace) {
        set({ currentSpaceId: currentSpace });
      }

      // Load spaces
      const spacesData = await AsyncStorage.getItem('user_spaces');
      if (spacesData) {
        const spaces = safeJsonParse<UserSpace[]>(spacesData, [], true);
        if (spaces.length === 0 && spacesData.trim().length > 0) {
          Logger.error('[AppContext] Failed to parse user spaces, using defaults');
        }
        set({ spaces });
      }

      // Load settings
      await get().loadSettings();

      // Load last active tab
      const lastTab = await AsyncStorage.getItem('last_active_tab');
      if (lastTab) {
        set({ lastActiveTab: lastTab });
      }

      Logger.info('[AppContext] Initialized successfully');
    } catch (error) {
      Logger.error('[AppContext] Initialization failed:', error);
    }
  },
}));

/**
 * Hook to get current space ID
 */
export function useCurrentSpace() {
  return useAppContext((state) => state.currentSpaceId);
}

/**
 * Hook to get app settings
 */
export function useSettings() {
  return useAppContext((state) => state.settings);
}

/**
 * Hook to update a specific setting
 */
export function useUpdateSetting() {
  const { updateSettings, settings } = useAppContext((state) => ({
    updateSettings: state.updateSettings,
    settings: state.settings,
  }));

  // Helper to update a single key; preserves existing nested object fields
  return async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const prevVal = settings[key];
    let newPartialSettings: Partial<AppSettings>;

    // Shallow-merge when both previous and new values are non-array objects
    if (
      prevVal &&
      typeof prevVal === 'object' &&
      !Array.isArray(prevVal) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      newPartialSettings = { [key]: { ...prevVal, ...value } };
    } else {
      newPartialSettings = { [key]: value };
    }

    // @ts-ignore: TS cannot fully resolve the dynamic key type here, but the logic is sound.
    return updateSettings(newPartialSettings);
  };
}
