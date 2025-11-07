/**
 * Bounce Animation Component
 *
 * Provides bounce animation for interactive elements and success states.
 * Uses React Native's Animated API for optimal performance.
 */

import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface BounceProps {
  children: React.ReactNode;
  duration?: number;
  scale?: number;
  delay?: number;
  loop?: boolean;
  style?: ViewStyle;
}

export function Bounce({
  children,
  duration = 600,
  scale = 1.2,
  delay = 0,
  loop = false,
  style,
}: BounceProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const bounceAnimation = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: scale,
        duration: duration / 3,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: duration / 3,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: duration / 3,
        useNativeDriver: true,
      }),
    ]);

    if (loop) {
      Animated.loop(bounceAnimation).start();
    } else {
      bounceAnimation.start();
    }
  }, [scaleAnim, duration, scale, delay, loop]);

  return (
    <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
      {children}
    </Animated.View>
  );
}
