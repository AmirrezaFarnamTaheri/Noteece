import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';
import { SharedItem } from '../../../lib/share-handler';

interface SharedContentBannerProps {
  sharedItems: SharedItem[];
  onDismiss: () => void;
  onItemPress: (item: SharedItem) => void;
}

export const SharedContentBanner: React.FC<SharedContentBannerProps> = ({ sharedItems, onDismiss, onItemPress }) => {
  if (sharedItems.length === 0) return null;

  return (
    <View style={styles.sharedContentBanner}>
      <View style={styles.sharedContentHeader}>
        <Ionicons name="share-outline" size={20} color="#007AFF" />
        <Text style={styles.sharedContentTitle}>
          {sharedItems.length} shared {sharedItems.length === 1 ? 'item' : 'items'}
        </Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sharedItemsScroll}>
        {sharedItems.map((item) => (
          <TouchableOpacity key={item.timestamp} style={styles.sharedItemCard} onPress={() => onItemPress(item)}>
            <Ionicons
              name={item.type === 'url' ? 'link' : item.type === 'image' ? 'image' : 'text'}
              size={24}
              color="#007AFF"
            />
            <Text style={styles.sharedItemType}>{item.type}</Text>
            <Text style={styles.sharedItemPreview} numberOfLines={2}>
              {item.url || item.text || ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sharedContentBanner: {
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#90CAF9',
    paddingVertical: 12,
  },
  sharedContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  sharedContentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  dismissButton: {
    padding: 4,
  },
  sharedItemsScroll: {
    paddingHorizontal: 16,
  },
  sharedItemCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    borderColor: '#90CAF9',
    alignItems: 'center',
  },
  sharedItemType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  sharedItemPreview: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});
