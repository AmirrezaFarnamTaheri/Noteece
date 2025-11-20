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
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PostCard } from "../components/social/PostCard";
import { PostCardSkeleton } from "../components/social/PostCardSkeleton";
import { CategoryPicker } from "../components/social/CategoryPicker";
import { ErrorFallback } from "../components/errors";
import { useSharedContent } from "../hooks/useSharedContent";
import { useCurrentSpace } from "../store/app-context";
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

interface SavedFilter {
  id: string;
  name: string;
  platforms: Platform[];
  categories: string[];
  icon: string;
}

export function SocialHub() {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [categories, setCategories] = useState<SocialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedPost, setSelectedPost] = useState<TimelinePost | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Filter states
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery] = useState("");

  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [selectedFilterIcon, setSelectedFilterIcon] = useState("📌");

  // Pagination
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Get current space from context
  const spaceId = useCurrentSpace();

  // Shared content from other apps
  const { hasSharedContent, sharedItems, processItems, refresh } =
    useSharedContent();

  // Load initial data and saved filters
  useEffect(() => {
    loadData();
    loadSavedFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load saved filters from storage
  const loadSavedFilters = async () => {
    try {
      const saved = await AsyncStorage.getItem(`social_filters_${spaceId}`);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load saved filters:", error);
    }
  };

  // Save current filter as preset
  const saveCurrentFilter = async () => {
    if (!newFilterName.trim()) {
      Alert.alert("Error", "Please enter a filter name");
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      platforms: selectedPlatforms,
      categories: selectedCategories,
      icon: selectedFilterIcon,
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);

    try {
      await AsyncStorage.setItem(
        `social_filters_${spaceId}`,
        JSON.stringify(updated),
      );
      setShowSaveFilterModal(false);
      setNewFilterName("");
      Alert.alert("Success", "Filter saved successfully");
    } catch (error) {
      console.error("Failed to save filter:", error);
      Alert.alert("Error", "Failed to save filter");
    }
  };

  // Apply saved filter
  const applySavedFilter = async (filter: SavedFilter) => {
    setSelectedPlatforms(filter.platforms);
    setSelectedCategories(filter.categories);
    setOffset(0);

    // Reload with new filters
    try {
      const filters: TimelineFilters = {
        platforms: filter.platforms.length > 0 ? filter.platforms : undefined,
        categories:
          filter.categories.length > 0 ? filter.categories : undefined,
      };
      const newPosts = await getTimelinePosts(spaceId, filters, 50, 0);
      setPosts(newPosts);
      setHasMore(newPosts.length === 50);
    } catch (error) {
      console.error("Failed to apply filter:", error);
    }
  };

  // Delete saved filter
  const deleteSavedFilter = async (filterId: string) => {
    const updated = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updated);

    try {
      await AsyncStorage.setItem(
        `social_filters_${spaceId}`,
        JSON.stringify(updated),
      );
    } catch (error) {
      console.error("Failed to delete filter:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedPosts, fetchedCategories] = await Promise.all([
        loadPosts(),
        loadCategories(),
      ]);
      setPosts(fetchedPosts);
      setCategories(fetchedCategories);
    } catch (err) {
      console.error("Failed to load social data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    const filters: TimelineFilters = {
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      categories:
        selectedCategories.length > 0 ? selectedCategories : undefined,
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

      // Also check for shared content
      await refresh();
      setHasMore(newPosts.length === 50);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const toAdd = categoryIds.filter(
        (id) => !currentCategoryIds.includes(id),
      );
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

  const handleSharedItemPress = (item: any) => {
    Alert.alert(
      "Shared Content",
      `Type: ${item.type}\n${item.url || item.text || ""}`,
      [
        { text: "Dismiss", style: "cancel" },
        {
          text: "Process",
          onPress: async () => {
            await processItems([item.timestamp]);
            Alert.alert("Success", "Shared content has been processed");
          },
        },
      ],
    );
  };

  const handleDismissSharedContent = async () => {
    const timestamps = sharedItems.map((item) => item.timestamp);
    await processItems(timestamps);
  };

  // Apply filters when they change
  useEffect(() => {
    if (!loading) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatforms, selectedCategories, searchQuery]);

  const availablePlatforms: Platform[] = [
    "twitter",
    "instagram",
    "linkedin",
    "youtube",
    "reddit",
    "tiktok",
  ];

  if (error && posts.length === 0) {
    return (
      <ErrorFallback
        error={error}
        message="Failed to load social feed"
        onRetry={loadData}
      />
    );
  }

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

      {/* Saved Filters Row */}
      {savedFilters.length > 0 && (
        <View style={styles.savedFiltersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedFiltersScroll}
          >
            {savedFilters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={styles.savedFilterChip}
                onPress={() => applySavedFilter(filter)}
                onLongPress={() =>
                  Alert.alert("Delete Filter", `Delete "${filter.name}"?`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteSavedFilter(filter.id),
                    },
                  ])
                }
              >
                <Text style={styles.savedFilterIcon}>{filter.icon}</Text>
                <Text style={styles.savedFilterText}>{filter.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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

          {/* Filter Actions */}
          {(selectedPlatforms.length > 0 || selectedCategories.length > 0) && (
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.saveFilterButton}
                onPress={() => setShowSaveFilterModal(true)}
              >
                <Ionicons name="bookmark-outline" size={16} color="#007AFF" />
                <Text style={styles.saveFilterText}>Save Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedPlatforms([]);
                  setSelectedCategories([]);
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Shared Content Banner */}
      {hasSharedContent && sharedItems.length > 0 && (
        <View style={styles.sharedContentBanner}>
          <View style={styles.sharedContentHeader}>
            <Ionicons name="share-outline" size={20} color="#007AFF" />
            <Text style={styles.sharedContentTitle}>
              {sharedItems.length} shared{" "}
              {sharedItems.length === 1 ? "item" : "items"}
            </Text>
            <TouchableOpacity
              onPress={handleDismissSharedContent}
              style={styles.dismissButton}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sharedItemsScroll}
          >
            {sharedItems.map((item, index) => (
              <TouchableOpacity
                key={`${item.timestamp}-${index}`}
                style={styles.sharedItemCard}
                onPress={() => handleSharedItemPress(item)}
              >
                <Ionicons
                  name={
                    item.type === "url"
                      ? "link"
                      : item.type === "image"
                        ? "image"
                        : "text"
                  }
                  size={24}
                  color="#007AFF"
                />
                <Text style={styles.sharedItemType}>{item.type}</Text>
                <Text style={styles.sharedItemPreview} numberOfLines={2}>
                  {item.url || item.text || ""}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Timeline */}
      {loading && posts.length === 0 ? (
        <View>
          <PostCardSkeleton count={5} />
        </View>
      ) : (
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
      )}

      {/* Category Picker Modal */}
      <CategoryPicker
        visible={showCategoryPicker}
        categories={categories}
        selectedCategoryIds={selectedPost?.categories.map((c) => c.id) || []}
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

      {/* Save Filter Modal */}
      <Modal
        visible={showSaveFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Filter Preset</Text>
              <TouchableOpacity onPress={() => setShowSaveFilterModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Filter name (e.g., Work Updates)"
              value={newFilterName}
              onChangeText={setNewFilterName}
              autoFocus
            />

            <Text style={styles.modalLabel}>Choose an icon:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.iconPicker}
            >
              {["📌", "⭐", "🔥", "💼", "📰", "🎯", "💡", "🎨"].map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    selectedFilterIcon === icon && styles.iconOptionSelected,
                  ]}
                  onPress={() => setSelectedFilterIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowSaveFilterModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={saveCurrentFilter}
              >
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sharedContentBanner: {
    backgroundColor: "#E3F2FD",
    borderBottomWidth: 1,
    borderBottomColor: "#90CAF9",
    paddingVertical: 12,
  },
  sharedContentHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  sharedContentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1976D2",
  },
  dismissButton: {
    padding: 4,
  },
  sharedItemsScroll: {
    paddingHorizontal: 16,
  },
  sharedItemCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    borderColor: "#90CAF9",
    alignItems: "center",
  },
  sharedItemType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 4,
    textTransform: "uppercase",
  },
  sharedItemPreview: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  savedFiltersRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  savedFiltersScroll: {
    paddingRight: 16,
  },
  savedFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
  },
  savedFilterIcon: {
    fontSize: 16,
  },
  savedFilterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  filterActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  saveFilterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    gap: 6,
  },
  saveFilterText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  iconPicker: {
    marginBottom: 24,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconOptionSelected: {
    backgroundColor: "#007AFF",
  },
  iconOptionText: {
    fontSize: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});
