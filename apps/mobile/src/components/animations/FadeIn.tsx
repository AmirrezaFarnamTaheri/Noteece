/**
 * FadeIn Animation Component
 *
 * Provides smooth fade-in animation for any child component.
 * Uses React Native's Animated API for optimal performance.
 */

import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export function FadeIn({
  children,
  duration = 300,
  delay = 0,
  style,
}: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [opacity, duration, delay]);

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}
