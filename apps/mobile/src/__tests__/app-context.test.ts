import { useAppContext } from '../store/app-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticManager } from '../lib/haptics';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../lib/haptics', () => ({
  hapticManager: {
    setEnabled: jest.fn(),
  },
}));
jest.mock('../lib/logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AppContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAppContext.setState({
      currentSpaceId: 'default',
      spaces: [{ id: 'default', name: 'My Space', createdAt: Date.now(), lastSyncedAt: null }],
      settings: {
        language: 'en',
        notifications: true,
        haptics: true,
        theme: {
          mode: 'dark',
          primaryColor: '#6366F1',
          accentColor: '#8B5CF6',
          fontSize: 'medium',
          fontFamily: 'default',
        },
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
      },
      isOnboarded: false,
      lastActiveTab: null,
    });
  });

  it('should initialize with default state', () => {
    const state = useAppContext.getState();
    expect(state.currentSpaceId).toBe('default');
    expect(state.spaces).toHaveLength(1);
    expect(state.settings.language).toBe('en');
    expect(state.isOnboarded).toBe(false);
  });

  describe('Space Management', () => {
    it('should create a new space', async () => {
      const { createSpace } = useAppContext.getState();
      const newSpace = await createSpace('Work');

      const state = useAppContext.getState();
      expect(state.spaces).toHaveLength(2);
      expect(state.spaces).toContainEqual(newSpace);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_spaces', expect.any(String));
    });

    it('should set current space', async () => {
      const { createSpace, setCurrentSpace } = useAppContext.getState();
      const newSpace = await createSpace('Work');

      await setCurrentSpace(newSpace.id);

      const state = useAppContext.getState();
      expect(state.currentSpaceId).toBe(newSpace.id);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('current_space_id', newSpace.id);
    });

    it('should throw when setting invalid space', async () => {
      const { setCurrentSpace } = useAppContext.getState();
      await expect(setCurrentSpace('invalid-id')).rejects.toThrow('Space invalid-id not found');
    });

    it('should delete a space and switch to default if current', async () => {
      const { createSpace, setCurrentSpace, deleteSpace } = useAppContext.getState();
      const newSpace = await createSpace('Temp');
      await setCurrentSpace(newSpace.id);

      await deleteSpace(newSpace.id);

      const state = useAppContext.getState();
      expect(state.spaces).toHaveLength(1);
      expect(state.spaces[0].id).toBe('default');
      expect(state.currentSpaceId).toBe('default');
    });

    it('should prevent deleting default space', async () => {
      const { deleteSpace } = useAppContext.getState();
      await expect(deleteSpace('default')).rejects.toThrow('Cannot delete default space');
    });
  });

  describe('Settings Management', () => {
    it('should update settings', async () => {
      const { updateSettings } = useAppContext.getState();
      await updateSettings({ language: 'fr', haptics: false });

      const state = useAppContext.getState();
      expect(state.settings.language).toBe('fr');
      expect(state.settings.haptics).toBe(false);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('app_settings', expect.any(String));
      expect(hapticManager.setEnabled).toHaveBeenCalledWith(false);
    });

    it('should load settings from storage', async () => {
      const storedSettings = { language: 'es', haptics: false };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedSettings));

      const { loadSettings } = useAppContext.getState();
      await loadSettings();

      const state = useAppContext.getState();
      expect(state.settings.language).toBe('es');
      expect(state.settings.haptics).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should load persisted state on initialize', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        switch (key) {
          case 'is_onboarded':
            return Promise.resolve('true');
          case 'current_space_id':
            return Promise.resolve('space_123');
          case 'user_spaces':
            return Promise.resolve(
              JSON.stringify([
                { id: 'default', name: 'Default' },
                { id: 'space_123', name: 'Work' },
              ])
            );
          case 'last_active_tab':
            return Promise.resolve('settings');
          default:
            return Promise.resolve(null);
        }
      });

      const { initialize } = useAppContext.getState();
      await initialize();

      const state = useAppContext.getState();
      expect(state.isOnboarded).toBe(true);
      expect(state.currentSpaceId).toBe('space_123');
      expect(state.spaces).toHaveLength(2);
      expect(state.lastActiveTab).toBe('settings');
    });
  });
});
