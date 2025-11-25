/**
 * ColorPicker Component
 *
 * A reusable color picker with predefined palette and custom color input.
 * Used for category colors, theme customization, and other color selections.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../../lib/haptics';

interface ColorPickerProps {
  visible: boolean;
  selectedColor?: string;
  onSelectColor: (color: string) => void;
  onClose: () => void;
  title?: string;
  showCustomInput?: boolean;
}

// Predefined color palette (Material Design-inspired)
const COLOR_PALETTE = [
  // Reds
  '#F44336',
  '#E91E63',
  '#FF5252',
  '#FF1744',
  // Purples
  '#9C27B0',
  '#673AB7',
  '#E040FB',
  '#7C4DFF',
  // Blues
  '#2196F3',
  '#3F51B5',
  '#03A9F4',
  '#448AFF',
  // Cyans & Teals
  '#00BCD4',
  '#009688',
  '#00E5FF',
  '#1DE9B6',
  // Greens
  '#4CAF50',
  '#8BC34A',
  '#00E676',
  '#76FF03',
  // Yellows & Oranges
  '#FFEB3B',
  '#FFC107',
  '#FF9800',
  '#FF6F00',
  // Browns & Greys
  '#795548',
  '#9E9E9E',
  '#607D8B',
  '#455A64',
  // Special colors
  '#000000',
  '#FFFFFF',
  '#FF4081',
  '#00BFA5',
];

export function ColorPicker({
  visible,
  selectedColor,
  onSelectColor,
  onClose,
  title = 'Select Color',
  showCustomInput = true,
}: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(selectedColor || '#000000');

  const handleSelectColor = (color: string) => {
    haptics.selection();
    onSelectColor(color);
    onClose();
  };

  const handleSelectCustomColor = () => {
    // Validate hex color format
    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
    if (hexColorRegex.test(customColor)) {
      haptics.success();
      onSelectColor(customColor.toUpperCase());
      onClose();
    } else {
      haptics.error();
    }
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

          {/* Color Grid */}
          <ScrollView style={styles.scrollView}>
            <View style={styles.colorGrid}>
              {COLOR_PALETTE.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorButton, { backgroundColor: color }, isSelected && styles.selectedColorButton]}
                    onPress={() => handleSelectColor(color)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={24}
                        color={color === '#FFFFFF' || color === '#FFEB3B' ? '#000' : '#FFF'}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Color Input */}
            {showCustomInput && (
              <View style={styles.customSection}>
                <Text style={styles.sectionTitle}>Custom Color</Text>
                <View style={styles.customInputContainer}>
                  <View style={[styles.customColorPreview, { backgroundColor: customColor }]} />
                  <TextInput
                    style={styles.customInput}
                    value={customColor}
                    onChangeText={setCustomColor}
                    placeholder="#000000"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                  <TouchableOpacity style={styles.applyButton} onPress={handleSelectCustomColor}>
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Enter hex color code (e.g., #FF5733)</Text>
              </View>
            )}
          </ScrollView>
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
  scrollView: {
    padding: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorButton: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  customSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  customColorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DDD',
  },
  customInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    fontFamily: 'monospace',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
});
