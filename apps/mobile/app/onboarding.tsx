import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography, spacing } from "@/lib/theme";
import { useVaultStore } from "@/store/vault";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingStep {
  icon: string;
  title: string;
  description: string;
  features: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: "shield-checkmark",
    title: "Your Personal Intelligence Vault",
    description:
      "Noteece is your encrypted personal knowledge base that learns from your data to help you work smarter.",
    features: [
      "End-to-end encryption",
      "Local-first, offline-capable",
      "Zero-knowledge architecture",
    ],
  },
  {
    icon: "flash",
    title: "Foresight 3.0 Intelligence",
    description:
      "Advanced correlation engine that synthesizes your tasks, time, health, and finance data into actionable insights.",
    features: [
      "Daily briefs and predictions",
      "Burnout risk analysis",
      "Smart recommendations",
    ],
  },
  {
    icon: "git-network",
    title: "Seamless Local Sync",
    description:
      "Sync securely between your devices on your local network. No cloud required.",
    features: [
      "Peer-to-peer encryption",
      "Automatic conflict resolution",
      "Background sync",
    ],
  },
  {
    icon: "rocket",
    title: "Physical-Digital Bridge",
    description:
      "Use NFC tags and geofencing to blend your digital and physical workflows.",
    features: [
      "NFC trigger actions",
      "Location-based reminders",
      "Quick capture shortcuts",
    ],
  },
];

export default function OnboardingScreen() {
  const { createVault } = useVaultStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isLastFeatureStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isPasswordStep = currentStep === ONBOARDING_STEPS.length;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      // Fade animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({
        x: (currentStep + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({
        x: (currentStep - 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleCreateVault = async () => {
    // Validation
    if (password.length < 8) {
      Alert.alert(
        "Password Too Short",
        "Password must be at least 8 characters long",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords Don't Match",
        "Please make sure both passwords match",
      );
      return;
    }

    setIsCreating(true);

    try {
      const success = await createVault(password);

      if (success) {
        // Navigate to main app
        router.replace("/(tabs)/today");
      } else {
        Alert.alert("Error", "Failed to create vault. Please try again.");
      }
    } catch (error) {
      console.error("Create vault error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const renderFeatureStep = (step: OnboardingStep, index: number) => (
    <View key={index} style={styles.stepContainer}>
      <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={step.icon as any} size={80} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>

          {/* Features list */}
          <View style={styles.featuresList}>
            {step.features.map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.success}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepContent}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="key" size={80} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          <Text style={styles.stepTitle}>Create Your Vault</Text>
          <Text style={styles.stepDescription}>
            Choose a strong password. This encrypts all your data locally.
          </Text>

          {/* Password input */}
          <View style={styles.passwordForm}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={24}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.togglePasswordButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed"
                size={24}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleCreateVault}
              />
            </View>
          </View>

          {/* Security notice */}
          <View style={styles.securityNotice}>
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.warning}
            />
            <Text style={styles.securityNoticeText}>
              This password cannot be recovered. Store it safely.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#0A0E27", "#1E2235", "#0A0E27"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Progress indicators */}
        <View style={styles.progressContainer}>
          {[...ONBOARDING_STEPS, { icon: "key" }].map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
                index < currentStep && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {ONBOARDING_STEPS.map((step, index) =>
            renderFeatureStep(step, index),
          )}
          {renderPasswordStep()}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.textPrimary}
              />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.navigationSpacer} />

          {isPasswordStep ? (
            <TouchableOpacity
              style={[
                styles.createButton,
                isCreating && styles.createButtonDisabled,
              ]}
              onPress={handleCreateVault}
              disabled={isCreating}
            >
              <LinearGradient
                colors={
                  isCreating ? ["#4B5563", "#6B7280"] : ["#6366F1", "#8B5CF6"]
                }
                style={styles.createButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.createButtonText}>
                  {isCreating ? "Creating..." : "Create Vault"}
                </Text>
                {!isCreating && (
                  <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.nextButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.nextButtonText}>
                  {isLastFeatureStep ? "Get Started" : "Next"}
                </Text>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
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
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    width: 32,
    backgroundColor: colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: colors.success,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: SCREEN_WIDTH * 5, // 4 feature steps + 1 password step
  },
  stepContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  stepContent: {
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: spacing["2xl"],
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  textContent: {
    width: "100%",
  },
  stepTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  stepDescription: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: typography.fontSize.base * 1.6,
    marginBottom: spacing.xl,
  },
  featuresList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  passwordForm: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
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
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.warning}10`,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  navigationSpacer: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  nextButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  nextButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: "#FFFFFF",
  },
  createButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    shadowOpacity: 0.1,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  createButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: "#FFFFFF",
  },
});
