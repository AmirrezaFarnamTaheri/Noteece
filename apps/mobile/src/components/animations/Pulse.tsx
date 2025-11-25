/**
 * Pulse Animation Component
 *
 * Provides continuous pulsing animation for attention-grabbing elements.
 * Uses React Native's Animated API for optimal performance.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface PulseProps {
  children: React.ReactNode;
  duration?: number;
  minScale?: number;
  maxScale?: number;
  repeat?: boolean;
  style?: ViewStyle;
}

export function Pulse({
  children,
  duration = 1000,
  minScale = 0.95,
  maxScale = 1.05,
  repeat = true,
  style,
}: PulseProps) {
  const scale = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
    );

    if (repeat) {
      animation.start();
    }

    return () => {
      animation.stop();
    };
  }, [scale, duration, minScale, maxScale, repeat]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
