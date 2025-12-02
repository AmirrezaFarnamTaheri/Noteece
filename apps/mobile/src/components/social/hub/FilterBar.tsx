import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';
import type { SocialCategory, Platform } from '../../../types/social';
import { PLATFORM_CONFIGS } from '../../../types/social';

interface FilterBarProps {
  showFilters: boolean;
  selectedPlatforms: Platform[];
  selectedCategories: string[];
  categories: SocialCategory[];
  onTogglePlatform: (platform: Platform) => void;
  onToggleCategory: (categoryId: string) => void;
  onSaveFilter: () => void;
  onClearFilters: () => void;
}

const availablePlatforms = (Object.keys(PLATFORM_CONFIGS) as string[]).filter(
  (k): k is Platform => k in PLATFORM_CONFIGS
);

export const FilterBar: React.FC<FilterBarProps> = ({
  showFilters,
  selectedPlatforms,
  selectedCategories,
  categories,
  onTogglePlatform,
  onToggleCategory,
  onSaveFilter,
  onClearFilters,
}) => {
  if (!showFilters) return null;

  return (
    <View style={styles.filterBar}>
      {/* Platform Filters */}
      <Text style={styles.filterLabel}>Platforms:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
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
              onPress={() => onTogglePlatform(platform)}
            >
              <Text style={styles.filterChipIcon}>{config.icon}</Text>
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>{config.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Filters */}
      <Text style={styles.filterLabel}>Categories:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.filterChip,
                isSelected && {
                  backgroundColor: category.color || '#007AFF',
                  borderColor: category.color || '#007AFF',
                },
              ]}
              onPress={() => onToggleCategory(category.id)}
            >
              {category.icon && <Text style={styles.filterChipIcon}>{category.icon}</Text>}
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>{category.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter Actions */}
      {(selectedPlatforms.length > 0 || selectedCategories.length > 0) && (
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.saveFilterButton} onPress={onSaveFilter}>
            <Ionicons name="bookmark-outline" size={16} color="#007AFF" />
            <Text style={styles.saveFilterText}>Save Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={onClearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  filterBar: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    marginRight: 8,
    gap: 6,
  },
  filterChipIcon: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  filterActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  saveFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    gap: 6,
  },
  saveFilterText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  clearFiltersButton: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
