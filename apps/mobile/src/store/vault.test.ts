const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

const mockLocalAuth = {
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('expo-local-authentication', () => mockLocalAuth);

describe('Vault Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('checkVaultExists', () => {
    it('returns true when vault metadata exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          spaceId: 'test-space',
          createdAt: Date.now(),
          version: '1.0.0',
          passwordSalt: 'dGVzdA==',
          passwordHash: 'dGVzdA==',
          dekSalt: 'dGVzdA==',
          encryptedDek: 'dGVzdA==',
          dekNonce: 'dGVzdA==',
        }),
      );

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const exists = await useVaultStore.getState().checkVaultExists();
      expect(exists).toBe(true);
    });

    it('returns false when no vault metadata', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const exists = await useVaultStore.getState().checkVaultExists();
      expect(exists).toBe(false);
    });
  });

  describe('lockVault', () => {
    it('sets isUnlocked to false and dek to null', async () => {
      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const store = useVaultStore.getState();

      store.lockVault();

      const state = useVaultStore.getState();
      expect(state.isUnlocked).toBe(false);
      expect(state.dek).toBeNull();
    });
  });

  describe('isBiometricAvailable', () => {
    it('returns true when hardware available and enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const available = await useVaultStore.getState().isBiometricAvailable();
      expect(available).toBe(true);
    });

    it('returns false when hardware not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const available = await useVaultStore.getState().isBiometricAvailable();
      expect(available).toBe(false);
    });

    it('returns false when not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const available = await useVaultStore.getState().isBiometricAvailable();
      expect(available).toBe(false);
    });
  });

  describe('isBiometricEnabled', () => {
    it('returns true when biometric data exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(
        JSON.stringify({
          dek: 'dGVzdA==',
          spaceId: 'test',
          enabledAt: Date.now(),
        }),
      );

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const enabled = await useVaultStore.getState().isBiometricEnabled();
      expect(enabled).toBe(true);
    });

    it('returns false when no biometric data', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const enabled = await useVaultStore.getState().isBiometricEnabled();
      expect(enabled).toBe(false);
    });
  });

  describe('disableBiometric', () => {
    it('deletes biometric data from secure store', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      const { useVaultStore } = require('./vault') as typeof import('./vault');
      const result = await useVaultStore.getState().disableBiometric();
      expect(result).toBe(true);
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_vault_data');
    });
  });
});
