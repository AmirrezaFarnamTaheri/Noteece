/**
 * Social Tab Screen
 *
 * Main entry point for the social media suite on mobile.
 * Displays the unified social timeline with optional biometric lock.
 */

import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SocialHub } from "@/screens/SocialHub";
import { BiometricLockScreen } from "@/components/social/BiometricLockScreen";
import { requiresSocialAuthentication, lockSocialSession } from "@/lib/social-security";
import { colors } from "@/lib/theme";
import { AppState, AppStateStatus } from "react-native";

export default function SocialTab() {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication requirement on mount
  useEffect(() => {
    checkAuthRequired();
  }, []);

  // Lock session when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const checkAuthRequired = async () => {
    const required = await requiresSocialAuthentication();
    setIsLocked(required);
    setIsChecking(false);
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === "background" || nextAppState === "inactive") {
      // Lock session when app goes to background
      await lockSocialSession();
      const required = await requiresSocialAuthentication();
      setIsLocked(required);
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleCancel = () => {
    // Navigate back to previous tab
    router.back();
  };

  // Don't render anything while checking
  if (isChecking) {
    return <View style={styles.container} />;
  }

  // Show lock screen if authentication required
  if (isLocked) {
    return (
      <BiometricLockScreen onUnlock={handleUnlock} onCancel={handleCancel} />
    );
  }

  // Show social hub once authenticated
  return (
    <View style={styles.container}>
      <SocialHub />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
