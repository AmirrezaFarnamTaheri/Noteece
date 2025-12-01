/**
 * CategoryPicker Component
 *
 * Bottom sheet modal for assigning/removing categories from posts
 * Supports multi-select and creating new categories on the fly
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';
import { ColorPicker } from '../pickers/ColorPicker';
import { IconPicker } from '../pickers/IconPicker';
import { haptics } from '../../lib/haptics';
import type { SocialCategory } from '../../types/social';

interface CategoryPickerProps {
  visible: boolean;
  categories: SocialCategory[];
  selectedCategoryIds: string[];
  onClose: () => void;
  onSelect: (categoryIds: string[]) => void;
  onCreateCategory?: (name: string, color: string, icon: string) => void;
}

export function CategoryPicker({
  visible,
  categories,
  selectedCategoryIds,
  onClose,
  onSelect,
  onCreateCategory,
}: CategoryPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedCategoryIds));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#007AFF');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📌');
  const [searchQuery, setSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const filteredCategories = categories.filter((cat) => cat.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelected(newSelected);
  };

  const handleSave = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  const handleCreate = () => {
    if (newCategoryName.trim() && onCreateCategory) {
      haptics.success();
      onCreateCategory(newCategoryName.trim(), newCategoryColor, newCategoryIcon);
      setNewCategoryName('');
      setNewCategoryColor('#007AFF');
      setNewCategoryIcon('📌');
      setShowCreateForm(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Assign Categories</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />

          {/* Category List */}
          <ScrollView style={styles.categoryList}>
            {filteredCategories.map((category) => {
              const isSelected = selected.has(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    isSelected && styles.categoryItemSelected,
                    {
                      borderColor: category.color || '#DDD',
                      backgroundColor: isSelected ? `${category.color || '#007AFF'}15` : 'transparent',
                    },
                  ]}
                  onPress={() => toggleCategory(category.id)}
                >
                  <View style={styles.categoryContent}>
                    {category.icon && <Text style={styles.categoryItemIcon}>{category.icon}</Text>}
                    <Text style={[styles.categoryItemText, { color: category.color || '#000' }]}>{category.name}</Text>
                  </View>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            {filteredCategories.length === 0 && searchQuery && (
              <Text style={styles.emptyText}>No categories found matching "{searchQuery}"</Text>
            )}
          </ScrollView>

          {/* Create Category Form */}
          {showCreateForm ? (
            <View style={styles.createForm}>
              <TextInput
                style={styles.createInput}
                placeholder="New category name"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
                placeholderTextColor="#999"
              />

              {/* Color and Icon Selection */}
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    haptics.light();
                    setShowColorPicker(true);
                  }}
                >
                  <View style={[styles.colorPreview, { backgroundColor: newCategoryColor }]} />
                  <Text style={styles.pickerButtonText}>Color</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    haptics.light();
                    setShowIconPicker(true);
                  }}
                >
                  <Text style={styles.iconPreview}>{newCategoryIcon}</Text>
                  <Text style={styles.pickerButtonText}>Icon</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.createButtons}>
                <TouchableOpacity
                  style={styles.createCancelButton}
                  onPress={() => {
                    setShowCreateForm(false);
                    setNewCategoryName('');
                    setNewCategoryColor('#007AFF');
                    setNewCategoryIcon('📌');
                  }}
                >
                  <Text style={styles.createCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createSaveButton, !newCategoryName.trim() && styles.createSaveButtonDisabled]}
                  onPress={handleCreate}
                  disabled={!newCategoryName.trim()}
                >
                  <Text style={styles.createSaveText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateForm(true)}>
              <Text style={styles.createButtonText}>+ Create New Category</Text>
            </TouchableOpacity>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={() => setSelected(new Set())}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save ({selected.size} selected)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Color Picker Modal */}
        <ColorPicker
          visible={showColorPicker}
          selectedColor={newCategoryColor}
          onSelectColor={(color) => {
            setNewCategoryColor(color);
            setShowColorPicker(false);
          }}
          onClose={() => setShowColorPicker(false)}
          title="Select Category Color"
        />

        {/* Icon Picker Modal */}
        <IconPicker
          visible={showIconPicker}
          selectedIcon={newCategoryIcon}
          onSelectIcon={(icon) => {
            setNewCategoryIcon(icon);
            setShowIconPicker(false);
          }}
          onClose={() => setShowIconPicker(false)}
          title="Select Category Icon"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    fontSize: 16,
    color: '#000',
  },
  categoryList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  categoryItemSelected: {
    borderWidth: 2,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryItemIcon: {
    fontSize: 20,
  },
  categoryItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 15,
    marginTop: 20,
  },
  createButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  createForm: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  createInput: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#000',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
  },
  iconPreview: {
    fontSize: 24,
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  createButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  createCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  createCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  createSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  createSaveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  createSaveText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});
