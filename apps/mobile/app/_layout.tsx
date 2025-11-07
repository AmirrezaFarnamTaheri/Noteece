import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useVaultStore } from "@/store/vault";
import { useAppContext } from "@/store/app-context";
import { initializeDatabase } from "@/lib/database";
import { startBackgroundSync } from "@/lib/sync/background-sync";
import { initSentry } from "@/lib/sentry";

// Initialize Sentry for error tracking
initSentry();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isUnlocked } = useVaultStore();
  const { initialize } = useAppContext();
  const [loaded, error] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch((err) => {
        console.error("Failed to hide splash screen:", err);
      });
    }
  }, [loaded, error]);

  useEffect(() => {
    // Initialize app context
    initialize().catch((err) => {
      console.error("Failed to initialize app context:", err);
    });

    // Initialize database on app start
    initializeDatabase().catch((err) => {
      console.error("Failed to initialize database:", err);
    });

    // Start background sync if vault is unlocked
    if (isUnlocked) {
      startBackgroundSync().catch((err) => {
        console.error("Failed to start background sync:", err);
      });
    }
  }, [isUnlocked, initialize]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              gestureEnabled: true,
              contentStyle: { backgroundColor: "#0A0E27" },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="unlock" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
