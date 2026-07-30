import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SocialSettings } from '../../screens/SocialSettings';
import * as Sharing from 'expo-sharing';
import { triggerManualSync } from '@/lib/sync/background-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('@/lib/social-security', () => ({
  isBiometricAvailable: jest.fn(() => Promise.resolve(true)),
  isSocialBiometricEnabled: jest.fn(() => Promise.resolve(false)),
  enableSocialBiometric: jest.fn(() => Promise.resolve(true)),
  disableSocialBiometric: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometricTypes: jest.fn(() => Promise.resolve(['FaceID'])),
}));

jest.mock('@/lib/sync/background-sync', () => ({
  startBackgroundSync: jest.fn(),
  stopBackgroundSync: jest.fn(),
  triggerManualSync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/store/app-context', () => ({
  useCurrentSpace: jest.fn(() => 'default'),
}));

jest.mock('@/lib/database', () => ({
  dbQuery: jest.fn(() => Promise.resolve([])),
}));

describe('SocialSettings Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('renders settings sections', async () => {
    const { getByText, findByText } = render(<SocialSettings />);

    expect(await findByText('Social Settings')).toBeTruthy();
    expect(getByText('SYNC SETTINGS')).toBeTruthy();
    expect(await findByText('SECURITY')).toBeTruthy();
    expect(getByText('DATA MANAGEMENT')).toBeTruthy();
  });

  it('renders the background-sync control', async () => {
    const { getByText } = render(<SocialSettings />);
    await waitFor(() => expect(getByText('Background Sync')).toBeTruthy());
  });

  it('handles manual sync', async () => {
    const { findByText } = render(<SocialSettings />);

    const syncBtn = await findByText('Sync Now');
    fireEvent.press(syncBtn);

    await waitFor(() => {
      expect(triggerManualSync).toHaveBeenCalled();
    });

    expect(await findByText(/Just now/)).toBeTruthy();
  });

  it('renders the biometric-lock control', async () => {
    const { getByText } = render(<SocialSettings />);
    await waitFor(() => expect(getByText('Biometric Lock')).toBeTruthy());
  });

  it('exports data', async () => {
    const { getByText } = render(<SocialSettings />);

    await waitFor(() => expect(getByText('Export Data')).toBeTruthy());
    fireEvent.press(getByText('Export Data'));

    await waitFor(() => {
      expect(Sharing.shareAsync).toHaveBeenCalled();
    });
  });
});
