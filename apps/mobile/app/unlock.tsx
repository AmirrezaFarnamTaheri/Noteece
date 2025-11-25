import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '@/lib/theme';
import { useVaultStore } from '@/store/vault';

export default function UnlockScreen() {
  const { unlockVault, unlockWithBiometric, isBiometricAvailable, isBiometricEnabled } = useVaultStore();
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);

      // Auto-trigger biometric unlock if enabled and available
      if (available && enabled) {
        // Small delay to show UI first
        setTimeout(() => {
          handleBiometricUnlock();
        }, 500);
      }
    }

    checkBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleUnlock = async () => {
    // Prevent concurrent unlock attempts
    if (isUnlocking) {
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter your vault password');
      return;
    }

    setIsUnlocking(true);

    try {
      // Simulate password verification delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const success = await unlockVault(password);

      if (success) {
        // Navigate to main app
        router.replace('/(tabs)/today');
      } else {
        shake();
        setPassword('');
        Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
      }
    } catch (error) {
      console.error('Unlock error:', error);
      shake();
      Alert.alert('Error', 'Failed to unlock vault. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device or no biometric data is enrolled.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (!biometricEnabled) {
      Alert.alert(
        'Biometric Not Enabled',
        'Biometric unlock is not enabled for this vault. Please unlock with your password first and enable it in Settings.',
        [{ text: 'OK' }],
      );
      return;
    }

    setIsUnlocking(true);

    try {
      const success = await unlockWithBiometric();

      if (success) {
        // Navigate to main app
        router.replace('/(tabs)/today');
      } else {
        shake();
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. Please try again or use your password.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Biometric unlock error:', error);
      shake();
      Alert.alert('Error', 'Failed to unlock with biometrics. Please use your password.', [{ text: 'OK' }]);
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#0A0E27', '#1E2235', '#0A0E27']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          {/* Logo/Icon Area */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="lock-closed" size={64} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Noteece</Text>
            <Text style={styles.subtitle}>Enter your password to unlock</Text>
          </View>

          {/* Password Input */}
          <Animated.View style={[styles.formContainer, { transform: [{ translateX: shakeAnimation }] }]}>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={24} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Vault password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleUnlock}
                editable={!isUnlocking}
                autoFocus
              />
              <TouchableOpacity style={styles.togglePasswordButton} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.unlockButton, isUnlocking && styles.unlockButtonDisabled]}
              onPress={handleUnlock}
              disabled={isUnlocking}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isUnlocking ? ['#4B5563', '#6B7280'] : ['#6366F1', '#8B5CF6']}
                style={styles.unlockButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isUnlocking ? (
                  <View style={styles.unlockButtonContent}>
                    <Text style={styles.unlockButtonText}>Unlocking...</Text>
                  </View>
                ) : (
                  <View style={styles.unlockButtonContent}>
                    <Ionicons name="lock-open-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.unlockButtonText}>Unlock Vault</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Alternative unlock methods */}
          {biometricAvailable && biometricEnabled && (
            <View style={styles.alternativeContainer}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricUnlock} disabled={isUnlocking}>
                <Ionicons name="finger-print" size={32} color={colors.primary} />
                <Text style={styles.biometricButtonText}>Use Biometrics</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Help text */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => {
                Alert.alert(
                  'Forgot Password?',
                  'For security reasons, if you forget your vault password, you will need to reset the app and lose all encrypted data. Make sure to back up your data regularly.',
                  [{ text: 'OK' }],
                );
              }}
            >
              <Text style={styles.helpButtonText}>Forgot password?</Text>
            </TouchableOpacity>

            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.securityBadgeText}>End-to-end encrypted • Zero-knowledge</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  togglePasswordButton: {
    padding: spacing.sm,
  },
  unlockButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockButtonDisabled: {
    shadowOpacity: 0.1,
  },
  unlockButtonGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  unlockButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  unlockButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: '#FFFFFF',
  },
  alternativeContainer: {
    marginBottom: spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  biometricButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  helpButton: {
    padding: spacing.sm,
  },
  helpButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.success}10`,
    borderRadius: 20,
  },
  securityBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
