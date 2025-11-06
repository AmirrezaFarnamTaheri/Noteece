import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

// Initialize Sentry for error tracking
export function initSentry() {
  // Only initialize Sentry if DSN is provided via environment variable
  const sentryDsn =
    Constants.expoConfig?.extra?.sentryDsn || process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.log("Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,

    // Enable automatic session tracking
    enableAutoSessionTracking: true,

    // Session tracking timeout in milliseconds (30 seconds)
    sessionTrackingIntervalMillis: 30000,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // We recommend adjusting this value in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Capture 100% of errors
    sampleRate: 1.0,

    // Environment
    environment: __DEV__ ? "development" : "production",

    // Release version
    release: Constants.expoConfig?.version || "1.0.0",

    // Dist (build number)
    dist:
      Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode?.toString(),

    // Enable native crashes
    enableNative: true,

    // Enable native NDK (Android)
    enableNativeCrashHandling: true,

    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        // Routing instrumentation for React Navigation
        routingInstrumentation: Sentry.reactNavigationIntegration(),

        // Enable automatic tracing
        tracingOrigins: ["localhost", /^\//],

        // Enable user interaction tracing
        enableUserInteractionTracing: true,
      }),
    ],

    // Before send hook - you can filter or modify events before sending
    beforeSend(event, hint) {
      // Filter out events in development if needed
      if (__DEV__) {
        console.log("Sentry Event:", event);
        console.log("Sentry Hint:", hint);
      }

      // Don't send events for certain types of errors if needed
      // if (event.exception?.values?.[0]?.type === 'NetworkError') {
      //   return null;
      // }

      return event;
    },

    // Before breadcrumb hook - you can filter or modify breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter sensitive data from breadcrumbs
      if (
        breadcrumb.category === "console" &&
        breadcrumb.message?.includes("password")
      ) {
        return null;
      }

      return breadcrumb;
    },
  });

  console.log("Sentry initialized successfully");
}

// Helper function to capture exceptions manually
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext("error_context", context);
  }
  Sentry.captureException(error);
}

// Helper function to capture messages
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
) {
  Sentry.captureMessage(message, level);
}

// Helper function to set user context
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser(user);
}

// Helper function to clear user context (on logout)
export function clearUser() {
  Sentry.setUser(null);
}

// Helper function to add breadcrumbs
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

// Helper function to set tags
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

// Helper function to set extra context
export function setExtra(key: string, value: any) {
  Sentry.setExtra(key, value);
}

// Export Sentry for direct access if needed
export { Sentry };
