/**
 * SkeletonCard Component
 *
 * Provides skeleton loading placeholder for card-based layouts.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";
import { spacing } from "@/lib/theme";

interface SkeletonCardProps {
  showImage?: boolean;
  lines?: number;
}

export function SkeletonCard({ showImage = true, lines = 3 }: SkeletonCardProps) {
  return (
    <View style={styles.card}>
      {showImage && (
        <SkeletonBox
          width="100%"
          height={160}
          borderRadius={8}
          style={styles.image}
        />
      )}
      <View style={styles.content}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBox
            key={index}
            width={index === lines - 1 ? "60%" : "100%"}
            height={16}
            style={styles.line}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  image: {
    marginBottom: spacing.md,
  },
  content: {
    gap: spacing.sm,
  },
  line: {
    marginBottom: spacing.xs,
  },
});
