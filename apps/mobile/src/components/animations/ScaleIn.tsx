/**
 * ScaleIn Animation Component
 *
 * Provides smooth scale-in animation with optional bounce effect.
 * Uses React Native's Animated API for optimal performance.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface ScaleInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  bounce?: boolean;
  style?: ViewStyle;
}

export function ScaleIn({
  children,
  duration = 300,
  delay = 0,
  initialScale = 0.8,
  bounce = false,
  style,
}: ScaleInProps) {
  const scale = useRef(new Animated.Value(initialScale)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: bounce ? 6 : 10,
        tension: bounce ? 40 : 80,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.7,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity, duration, delay, bounce]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
