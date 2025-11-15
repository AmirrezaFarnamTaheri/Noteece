/**
 * PostCardSkeleton Component
 *
 * Skeleton loading placeholder for PostCard component.
 * Shows animated loading state while posts are being fetched.
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

interface PostCardSkeletonProps {
  count?: number;
}

function SkeletonItem() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    loopAnim.start();

    return () => {
      loopAnim.stop();
      pulseAnim.stopAnimation();
    };
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.card}>
      {/* Header with platform badge and timestamp */}
      <View style={styles.header}>
        <Animated.View style={[styles.platformBadge, { opacity }]} />
        <Animated.View style={[styles.timestamp, { opacity }]} />
      </View>

      {/* Author info */}
      <View style={styles.authorSection}>
        <Animated.View style={[styles.avatar, { opacity }]} />
        <View style={styles.authorInfo}>
          <Animated.View style={[styles.authorName, { opacity }]} />
          <Animated.View style={[styles.authorHandle, { opacity }]} />
        </View>
      </View>

      {/* Content */}
      <Animated.View style={[styles.contentLine1, { opacity }]} />
      <Animated.View style={[styles.contentLine2, { opacity }]} />
      <Animated.View style={[styles.contentLine3, { opacity }]} />

      {/* Engagement metrics */}
      <View style={styles.engagement}>
        <Animated.View style={[styles.metric, { opacity }]} />
        <Animated.View style={[styles.metric, { opacity }]} />
        <Animated.View style={[styles.metric, { opacity }]} />
        <Animated.View style={[styles.metric, { opacity }]} />
      </View>

      {/* Categories placeholder */}
      <View style={styles.categoriesSection}>
        <Animated.View style={[styles.categoryTag, { opacity }]} />
        <Animated.View style={[styles.categoryTag, { opacity }]} />
      </View>
    </View>
  );
}

export function PostCardSkeleton({ count = 3 }: PostCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  platformBadge: {
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
  },
  timestamp: {
    width: 60,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2a2a2a",
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    width: 120,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
    marginBottom: 6,
  },
  authorHandle: {
    width: 80,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
  },
  contentLine1: {
    width: "100%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2a2a2a",
    marginBottom: 8,
  },
  contentLine2: {
    width: "95%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2a2a2a",
    marginBottom: 8,
  },
  contentLine3: {
    width: "70%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2a2a2a",
    marginBottom: 16,
  },
  engagement: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  metric: {
    width: 50,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
  },
  categoriesSection: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  categoryTag: {
    width: 60,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
  },
});
