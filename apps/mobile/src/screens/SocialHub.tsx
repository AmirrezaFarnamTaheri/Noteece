/**
 * SocialHub Screen
 *
 * Main screen for social media aggregation and management.
 * Displays unified timeline with filtering, search, and category management.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { PostCard } from "../components/social/PostCard";
import { CategoryPicker } from "../components/social/CategoryPicker";
import {
  getTimelinePosts,
  getCategories,
  assignCategory,
  removeCategory,
  createCategory,
} from "../lib/social-database";
import type {
  TimelinePost,
  SocialCategory,
  TimelineFilters,
  Platform,
} from "../types/social";
import { PLATFORM_CONFIGS } from "../types/social";

export function SocialHub() {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [categories, setCategories] = useState<SocialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<TimelinePost | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Filter states
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const spaceId = "default"; // TODO: Get from context/state

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedPosts, fetchedCategories] = await Promise.all([
        loadPosts(),
        loadCategories(),
      ]);
      setPosts(fetchedPosts);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Failed to load social data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    const filters: TimelineFilters = {
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      search_query: searchQuery || undefined,
    };

    return await getTimelinePosts(spaceId, filters, 50, 0);
  };

  const loadCategories = async () => {
    return await getCategories(spaceId);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setOffset(0);
      const [newPosts, newCategories] = await Promise.all([
        loadPosts(),
        loadCategories(),
      ]);
      setPosts(newPosts);
      setCategories(newCategories);
      setHasMore(newPosts.length === 50);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedPlatforms, selectedCategories, searchQuery]);

  const handleLoadMore = async () => {
    if (!hasMore || loading) return;

    try {
      const filters: TimelineFilters = {
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        categories:
          selectedCategories.length > 0 ? selectedCategories : undefined,
        search_query: searchQuery || undefined,
      };

      const newPosts = await getTimelinePosts(
        spaceId,
        filters,
        50,
        offset + 50,
      );

      if (newPosts.length > 0) {
        setPosts([...posts, ...newPosts]);
        setOffset(offset + 50);
        setHasMore(newPosts.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more:", error);
    }
  };

  const handleAssignCategories = async (
    post: TimelinePost,
    categoryIds: string[],
  ) => {
    try {
      // Get currently assigned category IDs
      const currentCategoryIds = post.categories.map((c) => c.id);

      // Find categories to add and remove
      const toAdd = categoryIds.filter((id) => !currentCategoryIds.includes(id));
      const toRemove = currentCategoryIds.filter(
        (id) => !categoryIds.includes(id),
      );

      // Assign new categories
      for (const categoryId of toAdd) {
        await assignCategory(post.id, categoryId);
      }

      // Remove unselected categories
      for (const categoryId of toRemove) {
        await removeCategory(post.id, categoryId);
      }

      // Refresh posts to show updated categories
      await handleRefresh();
    } catch (error) {
      console.error("Failed to assign categories:", error);
    }
  };

  const handleCreateCategory = async (
    name: string,
    color: string,
    icon: string,
  ) => {
    try {
      const newCategory = await createCategory(spaceId, name, color, icon);
      setCategories([...categories, newCategory]);
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  const togglePlatformFilter = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId],
    );
  };

  // Apply filters when they change
  useEffect(() => {
    if (!loading) {
      handleRefresh();
    }
  }, [selectedPlatforms, selectedCategories, searchQuery]);

  const availablePlatforms: Platform[] = [
    "twitter",
    "instagram",
    "linkedin",
    "youtube",
    "reddit",
    "tiktok",
  ];

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your social feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Hub</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {showFilters ? "Hide Filters" : "Filters"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      {showFilters && (
        <View style={styles.filterBar}>
          {/* Platform Filters */}
          <Text style={styles.filterLabel}>Platforms:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {availablePlatforms.map((platform) => {
              const config = PLATFORM_CONFIGS[platform];
              const isSelected = selectedPlatforms.includes(platform);
              return (
                <TouchableOpacity
                  key={platform}
                  style={[
                    styles.filterChip,
                    isSelected && {
                      backgroundColor: config.color,
                      borderColor: config.color,
                    },
                  ]}
                  onPress={() => togglePlatformFilter(platform)}
                >
                  <Text style={styles.filterChipIcon}>{config.icon}</Text>
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {config.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Category Filters */}
          <Text style={styles.filterLabel}>Categories:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterChip,
                    isSelected && {
                      backgroundColor: category.color || "#007AFF",
                      borderColor: category.color || "#007AFF",
                    },
                  ]}
                  onPress={() => toggleCategoryFilter(category.id)}
                >
                  {category.icon && (
                    <Text style={styles.filterChipIcon}>{category.icon}</Text>
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Clear Filters */}
          {(selectedPlatforms.length > 0 || selectedCategories.length > 0) && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSelectedPlatforms([]);
                setSelectedCategories([]);
              }}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Timeline */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onAssignCategory={() => {
              setSelectedPost(item);
              setShowCategoryPicker(true);
            }}
            onCategoryPress={(categoryId) => {
              // Navigate to category view
              console.log("Category pressed:", categoryId);
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Pull down to refresh or add social accounts
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#007AFF" />
            </View>
          ) : null
        }
      />

      {/* Category Picker Modal */}
      <CategoryPicker
        visible={showCategoryPicker}
        categories={categories}
        selectedCategoryIds={
          selectedPost?.categories.map((c) => c.id) || []
        }
        onClose={() => {
          setShowCategoryPicker(false);
          setSelectedPost(null);
        }}
        onSelect={(categoryIds) => {
          if (selectedPost) {
            handleAssignCategories(selectedPost, categoryIds);
          }
          setShowCategoryPicker(false);
          setSelectedPost(null);
        }}
        onCreateCategory={handleCreateCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  filterBar: {
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
    marginRight: 8,
    gap: 6,
  },
  filterChipIcon: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFF",
  },
  clearFiltersButton: {
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
