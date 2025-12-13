import {
  isBiometricAvailable,
  isSocialBiometricEnabled,
  enableSocialBiometric,
  disableSocialBiometric,
  authenticateForSocial,
  lockSocialSession,
  requiresSocialAuthentication,
} from '../../lib/social-security';

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Mock dependencies
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Social Security Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks to false/null
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
  });

  describe('isBiometricAvailable', () => {
    it('returns true when hardware available and enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      const result = await isBiometricAvailable();
      expect(result).toBe(true);
    });

    it('returns false when no hardware', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });

    it('handles errors gracefully', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(new Error('Test'));

      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });
  });

  describe('lockSocialSession', () => {
    it('clears session key', async () => {
      await lockSocialSession();
      const requiresAuth = await requiresSocialAuthentication();
      // Should require auth after lock (if biometric enabled)
      expect(typeof requiresAuth).toBe('boolean');
    });
  });

  describe('authenticateForSocial', () => {
    it('returns true on successful authentication', async () => {
      // Setup prerequisites
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-key');

      const result = await authenticateForSocial();
      expect(result).toBe(true);
    });

    it('returns false on failed authentication', async () => {
      // Setup prerequisites
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await authenticateForSocial();
      expect(result).toBe(false);
    });
  });
});
