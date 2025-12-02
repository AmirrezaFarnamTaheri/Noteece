/**
 * SocialHub Screen
 *
 * Main screen for social media aggregation and management.
 * Displays unified timeline with filtering, search, and category management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostCard } from '../components/social/PostCard';
import { PostCardSkeleton } from '../components/social/PostCardSkeleton';
import { CategoryPicker } from '../components/social/CategoryPicker';
import { ErrorFallback } from '../components/errors';
import { FilterBar } from '../components/social/hub/FilterBar';
import { SavedFilters, type SavedFilter } from '../components/social/hub/SavedFilters';
import { SharedContentBanner } from '../components/social/hub/SharedContentBanner';
import { SaveFilterModal } from '../components/social/hub/SaveFilterModal';
import { useSharedContent } from '../hooks/useSharedContent';
import { useCurrentSpace } from '../store/app-context';
import {
  getTimelinePosts,
  getCategories,
  assignCategory,
  removeCategory,
  createCategory,
} from '../lib/social-database';
import type { TimelinePost, SocialCategory, TimelineFilters, Platform, SharedItem } from '../types/social';

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
  const [searchQuery] = useState('');

  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [selectedFilterIcon, setSelectedFilterIcon] = useState('📌');

  // Pagination
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Get current space from context
  const spaceId = useCurrentSpace();

  // Shared content from other apps
  const { hasSharedContent, sharedItems, processItems, refresh } = useSharedContent();

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
      console.error('Failed to load saved filters:', error);
    }
  };

  // Save current filter as preset
  const saveCurrentFilter = async () => {
    if (!newFilterName.trim()) {
      Alert.alert('Error', 'Please enter a filter name');
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
      await AsyncStorage.setItem(`social_filters_${spaceId}`, JSON.stringify(updated));
      setShowSaveFilterModal(false);
      setNewFilterName('');
      Alert.alert('Success', 'Filter saved successfully');
    } catch (error) {
      console.error('Failed to save filter:', error);
      Alert.alert('Error', 'Failed to save filter');
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
        categories: filter.categories.length > 0 ? filter.categories : undefined,
      };
      const newPosts = await getTimelinePosts(spaceId, filters, 50, 0);
      setPosts(newPosts);
      setHasMore(newPosts.length === 50);
    } catch (error) {
      console.error('Failed to apply filter:', error);
    }
  };

  // Delete saved filter
  const deleteSavedFilter = async (filterId: string) => {
    const updated = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updated);

    try {
      await AsyncStorage.setItem(`social_filters_${spaceId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedPosts, fetchedCategories] = await Promise.all([loadPosts(), loadCategories()]);
      setPosts(fetchedPosts);
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('Failed to load social data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
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
      const [newPosts, newCategories] = await Promise.all([loadPosts(), loadCategories()]);
      setPosts(newPosts);
      setCategories(newCategories);

      // Also check for shared content
      await refresh();
      setHasMore(newPosts.length === 50);
    } catch (error) {
      console.error('Failed to refresh:', error);
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
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        search_query: searchQuery || undefined,
      };

      const newPosts = await getTimelinePosts(spaceId, filters, 50, offset + 50);

      if (newPosts.length > 0) {
        setPosts([...posts, ...newPosts]);
        setOffset(offset + 50);
        setHasMore(newPosts.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    }
  };

  const handleAssignCategories = async (post: TimelinePost, categoryIds: string[]) => {
    try {
      // Get currently assigned category IDs
      const currentCategoryIds = post.categories.map((c) => c.id);

      // Find categories to add and remove
      const toAdd = categoryIds.filter((id) => !currentCategoryIds.includes(id));
      const toRemove = currentCategoryIds.filter((id) => !categoryIds.includes(id));

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
      console.error('Failed to assign categories:', error);
    }
  };

  const handleCreateCategory = async (name: string, color: string, icon: string) => {
    try {
      const newCategory = await createCategory(spaceId, name, color, icon);
      setCategories([...categories, newCategory]);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const togglePlatformFilter = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId],
    );
  };

  const handleSharedItemPress = (item: any) => {
    Alert.alert('Shared Content', `Type: ${item.type}\n${item.url || item.text || ''}`, [
      { text: 'Dismiss', style: 'cancel' },
      {
        text: 'Process',
        onPress: async () => {
          await processItems([item.timestamp]);
          Alert.alert('Success', 'Shared content has been processed');
        },
      },
    ]);
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

  if (error && posts.length === 0) {
    return <ErrorFallback error={error} message="Failed to load social feed" onRetry={loadData} />;
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
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterButtonText}>{showFilters ? 'Hide Filters' : 'Filters'}</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Filters Row */}
      <SavedFilters
        savedFilters={savedFilters}
        onApplyFilter={applySavedFilter}
        onDeleteFilter={deleteSavedFilter}
      />

      {/* Filter Bar */}
      <FilterBar
        showFilters={showFilters}
        selectedPlatforms={selectedPlatforms}
        selectedCategories={selectedCategories}
        categories={categories}
        onTogglePlatform={togglePlatformFilter}
        onToggleCategory={toggleCategoryFilter}
        onSaveFilter={() => setShowSaveFilterModal(true)}
        onClearFilters={() => {
          setSelectedPlatforms([]);
          setSelectedCategories([]);
        }}
      />

      {/* Shared Content Banner */}
      {hasSharedContent && sharedItems.length > 0 && (
        <SharedContentBanner
          sharedItems={sharedItems}
          onDismiss={handleDismissSharedContent}
          onItemPress={handleSharedItemPress}
        />
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
                console.log('Category pressed:', categoryId);
              }}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh or add social accounts</Text>
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
      <SaveFilterModal
        visible={showSaveFilterModal}
        onClose={() => setShowSaveFilterModal(false)}
        onSave={saveCurrentFilter}
        filterName={newFilterName}
        setFilterName={setNewFilterName}
        selectedIcon={selectedFilterIcon}
        setSelectedIcon={setSelectedFilterIcon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
