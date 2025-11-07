/**
 * Rotation Animation Component
 *
 * Provides rotation animation for loading indicators and interactive elements.
 * Uses React Native's Animated API for optimal performance.
 */

import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface RotationProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  loop?: boolean;
  clockwise?: boolean;
  degrees?: number; // Total rotation degrees (360 for full rotation)
  style?: ViewStyle;
}

export function Rotation({
  children,
  duration = 1000,
  delay = 0,
  loop = true,
  clockwise = true,
  degrees = 360,
  style,
}: RotationProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotationAnimation = Animated.timing(rotateAnim, {
      toValue: clockwise ? 1 : -1,
      duration,
      delay,
      useNativeDriver: true,
    });

    if (loop) {
      Animated.loop(rotationAnimation).start();
    } else {
      rotationAnimation.start();
    }

    return () => {
      rotateAnim.setValue(0);
    };
  }, [rotateAnim, duration, delay, loop, clockwise]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${degrees}deg`],
  });

  return (
    <Animated.View style={[style, { transform: [{ rotate }] }]}>
      {children}
    </Animated.View>
  );
}
