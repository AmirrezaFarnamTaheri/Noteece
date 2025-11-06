import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useVaultStore } from "@/store/vault";
import { colors } from "@/lib/theme";

export default function Index() {
  const { isUnlocked, hasVault } = useVaultStore();

  useEffect(() => {
    // Navigate based on vault state
    const checkVault = async () => {
      if (!hasVault) {
        // No vault exists, go to onboarding
        router.replace("/onboarding");
      } else if (!isUnlocked) {
        // Vault exists but locked, go to unlock screen
        router.replace("/unlock");
      } else {
        // Vault unlocked, go to main app
        router.replace("/(tabs)/today");
      }
    };

    // Small delay to prevent flashing
    const timeoutId = setTimeout(checkVault, 500);

    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [isUnlocked, hasVault]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
