import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import type { Platform } from '../../../types/social';

export interface SavedFilter {
  id: string;
  name: string;
  platforms: Platform[];
  categories: string[];
  icon: string;
}

interface SavedFiltersProps {
  savedFilters: SavedFilter[];
  onApplyFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (filterId: string) => void;
}

export const SavedFilters: React.FC<SavedFiltersProps> = ({ savedFilters, onApplyFilter, onDeleteFilter }) => {
  if (savedFilters.length === 0) return null;

  return (
    <View style={styles.savedFiltersRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedFiltersScroll}>
        {savedFilters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={styles.savedFilterChip}
            onPress={() => onApplyFilter(filter)}
            onLongPress={() =>
              Alert.alert('Delete Filter', `Delete "${filter.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDeleteFilter(filter.id),
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
  );
};

const styles = StyleSheet.create({
  savedFiltersRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  savedFiltersScroll: {
    paddingRight: 16,
  },
  savedFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
  },
  savedFilterIcon: {
    fontSize: 16,
  },
  savedFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
