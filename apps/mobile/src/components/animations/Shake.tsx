/**
 * Shake Animation Component
 *
 * Provides shake animation for error states or attention-grabbing effects.
 * Uses React Native's Animated API for optimal performance.
 */

import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface ShakeProps {
  children: React.ReactNode;
  duration?: number;
  intensity?: number;
  repeat?: number;
  style?: ViewStyle;
  trigger?: boolean; // Trigger the animation when this changes to true
}

export function Shake({
  children,
  duration = 400,
  intensity = 10,
  repeat = 1,
  style,
  trigger = true,
}: ShakeProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;

    const baseShake = Animated.sequence([
      Animated.timing(translateX, {
        toValue: intensity,
        duration: duration / 8,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -intensity,
        duration: duration / 4,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: intensity * 0.7,
        duration: duration / 4,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -intensity * 0.5,
        duration: duration / 4,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: duration / 8,
        useNativeDriver: true,
      }),
    ]);

    const anim = repeat > 1 ? Animated.loop(baseShake, { iterations: repeat }) : baseShake;
    anim.start();

    return () => {
      translateX.stopAnimation();
      translateX.setValue(0);
    };
  }, [translateX, duration, intensity, repeat, trigger]);

  return (
    <Animated.View style={[style, { transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}
