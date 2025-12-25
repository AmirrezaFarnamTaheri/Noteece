import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { argon2id } from '@noble/hashes/argon2';
import { Logger } from './logger';

interface VaultMetadata {
  spaceId: string;
  createdAt: number;
  version: string;
  passwordSalt: string;
  passwordHash: string;
  dekSalt: string;
  encryptedDek: string;
  dekNonce: string;
}

/**
 * Derive key using Argon2id with secure parameters
 */
async function deriveKeyArgon2(password: string, salt: Uint8Array, outputLength: number = 32): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);

  const hash = argon2id(passwordBytes, salt, {
    t: 3,
    m: 65536,
    p: 4,
    dkLen: outputLength,
  });

  return hash;
}

/**
 * Verify password against stored Argon2 hash
 */
async function verifyPassword(password: string, salt: Uint8Array, storedHash: Uint8Array): Promise<boolean> {
  const derivedHash = await deriveKeyArgon2(password, salt, 32);

  if (derivedHash.length !== storedHash.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < derivedHash.length; i++) {
    diff |= derivedHash[i] ^ storedHash[i];
  }

  return diff === 0;
}

/**
 * Encrypt DEK using ChaCha20-Poly1305
 */
async function encryptDek(dek: Uint8Array, kek: Uint8Array): Promise<{ encrypted: Uint8Array; nonce: Uint8Array }> {
  if (!dek || dek.length !== 32) {
    throw new Error('Invalid DEK: expected 32 bytes');
  }
  if (!kek || kek.length !== 32) {
    throw new Error('Invalid KEK: expected 32 bytes');
  }

  const nonce = await Crypto.getRandomBytesAsync(12);
  const cipher = chacha20poly1305(kek, nonce);
  const encrypted = cipher.encrypt(dek);

  return { encrypted, nonce };
}

/**
 * Decrypt DEK using ChaCha20-Poly1305
 */
async function decryptDek(encrypted: Uint8Array, kek: Uint8Array, nonce: Uint8Array): Promise<Uint8Array> {
  if (!encrypted || encrypted.length !== 48) {
    throw new Error('Invalid encrypted DEK: expected 48 bytes (32 data + 16 tag)');
  }
  if (!kek || kek.length !== 32) {
    throw new Error('Invalid KEK: expected 32 bytes');
  }
  if (!nonce || nonce.length !== 12) {
    throw new Error('Invalid nonce: expected 12 bytes');
  }

  const cipher = chacha20poly1305(kek, nonce);
  const decrypted = cipher.decrypt(encrypted);

  if (decrypted.length !== 32) {
    throw new Error('Decrypted DEK has invalid length');
  }

  return decrypted;
}

/**
 * Change vault password
 * This re-encrypts the DEK with a new password-derived KEK
 */
export async function changeVaultPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate passwords
    if (!currentPassword || currentPassword.length < 8) {
      return {
        success: false,
        error: 'Current password must be at least 8 characters',
      };
    }
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'New password must be at least 8 characters',
      };
    }
    if (currentPassword === newPassword) {
      return {
        success: false,
        error: 'New password must be different from current password',
      };
    }

    // Load vault metadata
    const vaultData = await AsyncStorage.getItem('vault_metadata');
    if (!vaultData) {
      return { success: false, error: 'No vault found' };
    }

    const metadata: VaultMetadata = JSON.parse(vaultData);

    // Verify current password
    const passwordSalt = Uint8Array.from(atob(metadata.passwordSalt), (c) => c.charCodeAt(0));
    const passwordHash = Uint8Array.from(atob(metadata.passwordHash), (c) => c.charCodeAt(0));

    const isValid = await verifyPassword(currentPassword, passwordSalt, passwordHash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Decrypt DEK with current password
    const dekSalt = Uint8Array.from(atob(metadata.dekSalt), (c) => c.charCodeAt(0));
    const encryptedDek = Uint8Array.from(atob(metadata.encryptedDek), (c) => c.charCodeAt(0));
    const dekNonce = Uint8Array.from(atob(metadata.dekNonce), (c) => c.charCodeAt(0));
    const currentKek = await deriveKeyArgon2(currentPassword, dekSalt, 32);
    const dek = await decryptDek(encryptedDek, currentKek, dekNonce);

    // Generate new salts for the new password
    const newPasswordSalt = await Crypto.getRandomBytesAsync(32);
    const newDekSalt = await Crypto.getRandomBytesAsync(32);

    // Derive new password hash
    const newPasswordHash = await deriveKeyArgon2(newPassword, newPasswordSalt, 32);

    // Derive new KEK from new password
    const newKek = await deriveKeyArgon2(newPassword, newDekSalt, 32);

    // Re-encrypt DEK with new KEK
    const { encrypted: newEncryptedDek, nonce: newDekNonce } = await encryptDek(dek, newKek);

    // Update vault metadata
    const newMetadata: VaultMetadata = {
      ...metadata,
      passwordSalt: btoa(String.fromCharCode(...newPasswordSalt)),
      passwordHash: btoa(String.fromCharCode(...newPasswordHash)),
      dekSalt: btoa(String.fromCharCode(...newDekSalt)),
      encryptedDek: btoa(String.fromCharCode(...newEncryptedDek)),
      dekNonce: btoa(String.fromCharCode(...newDekNonce)),
    };

    // Save updated metadata
    await AsyncStorage.setItem('vault_metadata', JSON.stringify(newMetadata));

    // Clear biometric data since password changed
    try {
      await SecureStore.deleteItemAsync('biometric_vault_data');
    } catch {
      // Biometric data might not exist, that's okay
      if (__DEV__) {
        Logger.info('No biometric data to clear');
      }
    }

    return { success: true };
  } catch (error) {
    Logger.error('Failed to change password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password',
    };
  }
}
