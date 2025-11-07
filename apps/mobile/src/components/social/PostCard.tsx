/**
 * PostCard Component
 *
 * Displays an individual social media post in the timeline
 * with platform badge, author info, content, engagement metrics,
 * and category tags.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { format } from "date-fns";
import type { TimelinePost, Platform } from "../../types/social";
import { PLATFORM_CONFIGS } from "../../types/social";

interface PostCardProps {
  post: TimelinePost;
  onPress?: () => void;
  onCategoryPress?: (categoryId: string) => void;
  onAssignCategory?: () => void;
}

export function PostCard({
  post,
  onPress,
  onCategoryPress,
  onAssignCategory,
}: PostCardProps) {
  const platformConfig = PLATFORM_CONFIGS[post.platform as Platform];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header: Platform Badge + Author Info */}
      <View style={styles.header}>
        <View
          style={[
            styles.platformBadge,
            { backgroundColor: platformConfig.color },
          ]}
        >
          <Text style={styles.platformIcon}>{platformConfig.icon}</Text>
        </View>

        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>{post.author}</Text>
            {post.account_display_name && (
              <Text style={styles.accountName}>
                @{post.account_username}
              </Text>
            )}
          </View>
          <Text style={styles.timestamp}>
            {format(new Date(post.created_at), "MMM d, h:mm a")}
          </Text>
        </View>
      </View>

      {/* Content */}
      {post.content && (
        <Text style={styles.content} numberOfLines={10}>
          {post.content}
        </Text>
      )}

      {/* Media Preview */}
      {post.media_urls && post.media_urls.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.media_urls.slice(0, 4).map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.mediaThumbnail}
              resizeMode="cover"
            />
          ))}
          {post.media_urls.length > 4 && (
            <View style={styles.mediaOverlay}>
              <Text style={styles.mediaOverlayText}>
                +{post.media_urls.length - 4}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Engagement Metrics */}
      {post.engagement && (
        <View style={styles.engagement}>
          {post.engagement.likes !== undefined && post.engagement.likes > 0 && (
            <View style={styles.engagementItem}>
              <Text style={styles.engagementIcon}>❤️</Text>
              <Text style={styles.engagementText}>
                {formatNumber(post.engagement.likes)}
              </Text>
            </View>
          )}
          {post.engagement.comments !== undefined &&
            post.engagement.comments > 0 && (
              <View style={styles.engagementItem}>
                <Text style={styles.engagementIcon}>💬</Text>
                <Text style={styles.engagementText}>
                  {formatNumber(post.engagement.comments)}
                </Text>
              </View>
            )}
          {post.engagement.shares !== undefined &&
            post.engagement.shares > 0 && (
              <View style={styles.engagementItem}>
                <Text style={styles.engagementIcon}>🔄</Text>
                <Text style={styles.engagementText}>
                  {formatNumber(post.engagement.shares)}
                </Text>
              </View>
            )}
          {post.engagement.views !== undefined && post.engagement.views > 0 && (
            <View style={styles.engagementItem}>
              <Text style={styles.engagementIcon}>👁️</Text>
              <Text style={styles.engagementText}>
                {formatNumber(post.engagement.views)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Category Tags */}
      <View style={styles.footer}>
        <View style={styles.categories}>
          {post.categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryTag,
                {
                  backgroundColor: category.color
                    ? `${category.color}20`
                    : "#E0E0E0",
                  borderColor: category.color || "#999",
                },
              ]}
              onPress={() => onCategoryPress?.(category.id)}
            >
              {category.icon && (
                <Text style={styles.categoryIcon}>{category.icon}</Text>
              )}
              <Text
                style={[
                  styles.categoryText,
                  { color: category.color || "#666" },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Add Category Button */}
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={onAssignCategory}
          >
            <Text style={styles.addCategoryText}>+ Category</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  platformBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  platformIcon: {
    fontSize: 20,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginRight: 8,
  },
  accountName: {
    fontSize: 14,
    color: "#666",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 12,
  },
  mediaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 4,
  },
  mediaThumbnail: {
    width: "48%",
    height: 120,
    borderRadius: 8,
  },
  mediaOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: "48%",
    height: 120,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaOverlayText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "600",
  },
  engagement: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 16,
  },
  engagementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  engagementIcon: {
    fontSize: 16,
  },
  engagementText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
  },
  addCategoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    borderStyle: "dashed",
  },
  addCategoryText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
});
