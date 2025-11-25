/**
 * SlideIn Animation Component
 *
 * Provides smooth slide-in animation from various directions.
 * Uses React Native's Animated API for optimal performance.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

type Direction = 'left' | 'right' | 'top' | 'bottom';

interface SlideInProps {
  children: React.ReactNode;
  direction?: Direction;
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export function SlideIn({
  children,
  direction = 'bottom',
  duration = 300,
  delay = 0,
  distance = 50,
  style,
}: SlideInProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Set initial position based on direction
    switch (direction) {
      case 'left':
        translateX.setValue(-distance);
        break;
      case 'right':
        translateX.setValue(distance);
        break;
      case 'top':
        translateY.setValue(-distance);
        break;
      case 'bottom':
        translateY.setValue(distance);
        break;
    }

    // Animate to final position
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, translateY, opacity, direction, distance, duration, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
