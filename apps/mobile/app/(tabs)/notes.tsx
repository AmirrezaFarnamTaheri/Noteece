import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { getSyncBridge } from '@/lib/sync/sync-bridge';
import { Note } from '@/types';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const router = useRouter();

  const fetchNotes = useCallback(async () => {
    try {
      const bridge = getSyncBridge(); // Use singleton for consistency if needed, but we read direct from DB usually

      // Use the newly added getAllNotes method on the bridge (which handles JSI or DB fallback)
      const allNotes = await bridge.getAllNotes();

      let filtered = allNotes.filter((n) => !n.is_trashed);

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((n) => n.title.toLowerCase().includes(q) || n.content_md?.toLowerCase().includes(q));
      }

      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'created':
            return b.created_at - a.created_at;
          case 'updated':
          default:
            return b.modified_at - a.modified_at;
        }
      });

      setNotes(filtered);
    } catch (e) {
      console.error('Failed to fetch notes', e);
    }
  }, [searchQuery, sortBy]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(tabs)/capture', params: { id: item.id, mode: 'edit' } })}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.cardPreview} numberOfLines={3}>
        {item.content_md}
      </Text>
      <Text style={styles.cardDate}>{new Date(item.modified_at * 1000).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/capture')}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, sortBy === 'updated' && styles.filterChipActive]}
          onPress={() => setSortBy('updated')}
        >
          <Text style={[styles.filterText, sortBy === 'updated' && styles.filterTextActive]}>Recent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortBy === 'title' && styles.filterChipActive]}
          onPress={() => setSortBy('title')}
        >
          <Text style={[styles.filterText, sortBy === 'title' && styles.filterTextActive]}>Title</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notes found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.fontFamily.regular,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20', // 20% opacity
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.medium,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardPreview: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardDate: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: typography.fontSize.md,
  },
});
