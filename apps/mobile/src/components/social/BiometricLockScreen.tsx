/**
 * BiometricLockScreen Component
 *
 * Full-screen overlay requiring biometric authentication
 * before allowing access to Social Hub
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticateForSocial, getSupportedBiometricTypes } from '../../lib/social-security';
import { Logger } from '../../lib/logger';

interface BiometricLockScreenProps {
  onUnlock: () => void;
  onCancel?: () => void;
}

export function BiometricLockScreen({ onUnlock, onCancel }: BiometricLockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadBiometricTypes();

    // Auto-trigger authentication on mount
    const timeoutId = setTimeout(() => {
      handleAuthenticate();
    }, 500);

    // Start pulse animation
    startPulseAnimation();

    // Cleanup timeout on unmount
    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBiometricTypes = async () => {
    const types = await getSupportedBiometricTypes();
    setBiometricTypes(types);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const handleAuthenticate = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);

    try {
      const success = await authenticateForSocial();

      if (success) {
        onUnlock();
      } else {
        Alert.alert('Authentication Failed', 'Please authenticate to access Social Hub', [
          { text: 'Cancel', onPress: onCancel, style: 'cancel' },
          { text: 'Retry', onPress: handleAuthenticate },
        ]);
      }
    } catch (error) {
      Logger.error('Authentication error:', error);
      Alert.alert('Error', 'Failed to authenticate. Please try again.', [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'Retry', onPress: handleAuthenticate },
      ]);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const biometricTypeText = biometricTypes.join(' or ') || 'biometric';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0E27', '#1E2235', '#0A0E27']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Icon */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="finger-print" size={80} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>Social Hub Locked</Text>
          <Text style={styles.subtitle}>Authenticate with {biometricTypeText} to continue</Text>

          {/* Authenticate Button */}
          <TouchableOpacity
            style={styles.authenticateButton}
            onPress={handleAuthenticate}
            disabled={isAuthenticating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isAuthenticating ? ['#4B5563', '#6B7280'] : ['#6366F1', '#8B5CF6']}
              style={styles.authenticateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="lock-open-outline" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.authenticateButtonText}>
                {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Cancel Button */}
          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isAuthenticating}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {/* Info */}
          <View style={styles.infoContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#34C759" />
            <Text style={styles.infoText}>Biometric authentication required for security</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
  },
  authenticateButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authenticateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonIcon: {
    marginRight: 12,
  },
  authenticateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 20,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
