import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, typography, spacing } from "@/lib/theme";
import { Sentry } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log error with contextual information
    this.logError(error, errorInfo);
  }

  logError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Create structured error log
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        name: error.name,
      };

      // Log to console in development
      if (__DEV__) {
        console.group("🔴 Error Report");
        console.error("Error:", error);
        console.error("Component Stack:", errorInfo.componentStack);
        console.groupEnd();
      }

      // Send error to Sentry with component stack context (with scrubbing)
      try {
        const MAX_LEN = 16_384; // cap payload size to 16KB

        const truncate = (s?: string) =>
          typeof s === "string" && s.length > MAX_LEN
            ? s.slice(0, MAX_LEN) + "…[TRUNCATED]"
            : s;

        // Safer scrubbing with tighter patterns
        const scrub = (text?: string): string | undefined => {
          if (!text) return text;
          let scrubbed = text;

          // Basic secrets
          scrubbed = scrubbed
            .replace(/(password\s*[:=]\s*)([^\s,}]+)/gi, "$1[REDACTED]")
            .replace(/(token\s*[:=]\s*)([A-Za-z0-9._-]+)/gi, "$1[REDACTED]")
            .replace(/(secret\s*[:=]\s*)([A-Za-z0-9._-]+)/gi, "$1[REDACTED]")
            .replace(
              /(api[_-]?key\s*[:=]\s*)([A-Za-z0-9._-]+)/gi,
              "$1[REDACTED]",
            )
            .replace(
              /(authorization\s*[:=]\s*Bearer\s+)([A-Za-z0-9._-]+)/gi,
              "$1[REDACTED]",
            );

          // JWT-like tokens (header.payload.signature)
          scrubbed = scrubbed.replace(
            /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
            "[JWT_REDACTED]",
          );

          // Base64-like long tokens bounded by non-word boundaries to avoid paths
          scrubbed = scrubbed.replace(
            /(?<![A-Za-z0-9+/=])([A-Za-z0-9+/]{40,}={0,2})(?![A-Za-z0-9+/=])/g,
            "[BASE64_REDACTED]",
          );

          // Emails
          scrubbed = scrubbed.replace(
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
            "[EMAIL_REDACTED]",
          );

          // URL query strings
          scrubbed = scrubbed.replace(
            /(https?:\/\/[^\s?]+)\?[^\s]*/gi,
            "$1?[QUERY_REDACTED]",
          );

          return truncate(scrubbed);
        };

        const safeMessage = scrub(error.message);
        const safeStack = scrub(error.stack);
        const safeComponentStack = scrub(errorInfo.componentStack);

        Sentry.withScope((scope) => {
          // Clear inherited context to reduce leakage risk
          scope.clear();
          scope.setContext("react_error_boundary", {
            componentStack: safeComponentStack,
          });
          scope.setLevel("error");

          // Construct minimal sanitized error
          const sanitizedError = new Error(safeMessage || "Error");
          sanitizedError.name = error.name;
          sanitizedError.stack = safeStack;

          Sentry.captureException(sanitizedError);
        });
      } catch (sentryError) {
        console.error("Failed to send error to Sentry:", sentryError);
      }

      // Also log to AsyncStorage for local debugging
      AsyncStorage.getItem("error_logs")
        .then((logs) => {
          const errorLogs = logs ? JSON.parse(logs) : [];
          errorLogs.push(errorLog);
          // Keep only last 50 errors to avoid storage bloat
          const recentErrors = errorLogs.slice(-50);
          AsyncStorage.setItem("error_logs", JSON.stringify(recentErrors));
        })
        .catch((storageError) => {
          console.error("Failed to save error log:", storageError);
        });
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError);
    }
  }

  handleReset = () => {
    // Increment resetKey to force remount of children
    // This ensures any stateful components are fully reset
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: prevState.resetKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={64} color={colors.error} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.description}>
              The app encountered an unexpected error. Please try again.
            </Text>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={this.handleReset}
            >
              <Ionicons
                name="refresh-outline"
                size={24}
                color={colors.textPrimary}
              />
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>
                  Error Details (Dev Only):
                </Text>
                <Text style={styles.errorDetailsText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorDetailsText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    // Use resetKey to force remount of children after error recovery
    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: typography.fontSize.base * 1.6,
    marginBottom: spacing.xl,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  resetButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textPrimary,
  },
  errorDetails: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    maxHeight: 200,
    width: "100%",
  },
  errorDetailsTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorDetailsText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono || typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.xs * 1.4,
  },
});
