/**
 * IconPicker Component
 *
 * A reusable icon/emoji picker with categorized icons and search.
 * Used for category icons, saved filter icons, and other icon selections.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../../lib/haptics';

interface IconPickerProps {
  visible: boolean;
  selectedIcon?: string;
  onSelectIcon: (icon: string) => void;
  onClose: () => void;
  title?: string;
}

// Categorized icon collections
const ICON_CATEGORIES = {
  Popular: ['📌', '⭐', '❤️', '🔥', '✨', '🎯', '💡', '📝', '✅', '🚀'],
  Emotions: ['😀', '😂', '🥰', '😎', '🤔', '😴', '🤩', '😇', '😍', '🙌'],
  Activities: ['🎮', '🎨', '🎵', '📚', '💻', '🎬', '🏃', '🧘', '🎪', '🎭'],
  Food: ['🍕', '🍔', '🍜', '☕', '🍰', '🍎', '🥗', '🍱', '🌮', '🍺'],
  Travel: ['✈️', '🚗', '🏖️', '🗺️', '🏠', '🏢', '🏔️', '🌍', '🚂', '⛵'],
  Nature: ['🌸', '🌺', '🌲', '🌞', '🌙', '⚡', '🌈', '🔆', '❄️', '🍃'],
  Objects: ['📱', '💼', '🎁', '🔑', '💰', '📷', '⌚', '🎒', '🛒', '🔔'],
  Symbols: ['🔴', '🟢', '🔵', '🟡', '⚫', '⚪', '🔶', '🔷', '❗', '❓'],
  Flags: ['🚩', '🏁', '🏳️', '🏴', '🎌', '🏳️‍🌈', '⛳', '🚦', '🚥', '⚠️'],
  Sports: ['⚽', '🏀', '🎾', '⚾', '🏈', '🏐', '🏓', '🥊', '⛷️', '🏊'],
};

export function IconPicker({ visible, selectedIcon, onSelectIcon, onClose, title = 'Select Icon' }: IconPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Popular');
  const [searchQuery, setSearchQuery] = useState('');

  // Get all icons from all categories for search
  const allIcons = useMemo(() => {
    return Object.values(ICON_CATEGORIES).flat();
  }, []);

  // Filter icons based on search query
  const displayedIcons = useMemo(() => {
    if (searchQuery.trim()) {
      // For emoji search, we just show all icons that match visually
      // In a real app, you might want emoji names/keywords
      return allIcons;
    }
    return ICON_CATEGORIES[selectedCategory as keyof typeof ICON_CATEGORIES] || [];
  }, [selectedCategory, searchQuery, allIcons]);

  const handleSelectIcon = (icon: string) => {
    haptics.selection();
    onSelectIcon(icon);
    onClose();
  };

  const handleCategoryChange = (category: string) => {
    haptics.light();
    setSelectedCategory(category);
    setSearchQuery('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search icons..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          {!searchQuery && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabs}
              contentContainerStyle={styles.categoryTabsContent}
            >
              {Object.keys(ICON_CATEGORIES).map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
                    onPress={() => handleCategoryChange(category)}
                  >
                    <Text style={[styles.categoryTabText, isSelected && styles.categoryTabTextActive]}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Icon Grid */}
          <FlatList
            data={displayedIcons}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={6}
            contentContainerStyle={styles.iconGrid}
            renderItem={({ item }) => {
              const isSelected = selectedIcon === item;
              return (
                <TouchableOpacity
                  style={[styles.iconButton, isSelected && styles.selectedIconButton]}
                  onPress={() => handleSelectIcon(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iconText}>{item}</Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No icons found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 20,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  categoryTabs: {
    maxHeight: 50,
    marginBottom: 12,
  },
  categoryTabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  categoryTabActive: {
    backgroundColor: '#007AFF',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#FFF',
  },
  iconGrid: {
    padding: 20,
    paddingTop: 12,
  },
  iconButton: {
    width: '16.666%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  selectedIconButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  iconText: {
    fontSize: 32,
  },
  selectedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
