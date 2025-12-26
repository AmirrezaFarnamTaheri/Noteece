/**
 * Music Hub Screen
 *
 * Main screen for music library and playback.
 * Features: library browsing, playlists, now playing, search.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore: expo vector icons type mismatch
import { Ionicons } from '@expo/vector-icons';
import { dbQuery, dbExecute } from '@/lib/database';
import { nanoid } from 'nanoid/non-secure';
import { useCurrentSpace } from '../store/app-context';
import { Logger } from '@/lib/logger';
import type { Track, Playlist } from '../types/music';

// Database row types (snake_case from SQLite)
interface TrackDbRow {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number;
  uri: string | null;
  artwork_url: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  play_count: number;
  last_played_at: number | null;
  is_favorite: number; // SQLite boolean (0 or 1)
  added_at: number;
}

interface PlaylistDbRow {
  id: string;
  name: string;
  description: string | null;
  artwork_url: string | null;
  created_at: number;
  updated_at: number;
  is_smart_playlist: number; // SQLite boolean (0 or 1)
  smart_criteria_json: string | null;
}

// Database helper functions for loading music data
async function loadTracksFromDatabase(): Promise<Track[]> {
  try {
    const tracks = await dbQuery('SELECT * FROM track ORDER BY title ASC');
    // Map snake_case DB columns to camelCase Track type
    return tracks.map((t: TrackDbRow) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      uri: t.uri || '', // Provide default empty string for nullable uri
      artworkUrl: t.artwork_url,
      genre: t.genre,
      year: t.year,
      trackNumber: t.track_number,
      playCount: t.play_count || 0,
      lastPlayedAt: t.last_played_at,
      isFavorite: t.is_favorite === 1,
      addedAt: t.added_at,
    }));
  } catch (e) {
    Logger.error('Error loading tracks from database', { error: e });
    return [];
  }
}

async function loadPlaylistsFromDatabase(): Promise<Playlist[]> {
  try {
    const playlists = await dbQuery('SELECT * FROM playlist ORDER BY name ASC');
    // Need to get track counts and duration for each playlist
    const enhancedPlaylists = await Promise.all(
      playlists.map(async (p: PlaylistDbRow) => {
        // Join with track table to get total duration
        const stats = await dbQuery(
          `SELECT COUNT(*) as count, SUM(t.duration) as total_duration
           FROM playlist_track pt
           LEFT JOIN track t ON pt.track_id = t.id
           WHERE pt.playlist_id = ?`,
          [p.id],
        );
        const count = stats[0]?.count || 0;
        const duration = stats[0]?.total_duration || 0;

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          artworkUrl: p.artwork_url,
          trackCount: count,
          duration: duration,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          isSmartPlaylist: p.is_smart_playlist === 1,
          smartCriteria: p.smart_criteria_json ? JSON.parse(p.smart_criteria_json) : null,
        };
      }),
    );
    return enhancedPlaylists;
  } catch (e) {
    Logger.error('Error loading playlists from database', { error: e });
    return [];
  }
}

async function seedMusicData(spaceId: string) {
  const now = Date.now();

  const tracks = [
    {
      id: nanoid(),
      title: 'Moonlight Sonata',
      artist: 'Ludwig van Beethoven',
      album: 'Piano Sonatas',
      duration: 320,
      added_at: now,
      updated_at: now,
      is_favorite: 1,
    },
    {
      id: nanoid(),
      title: 'Clair de Lune',
      artist: 'Claude Debussy',
      album: 'Suite bergamasque',
      duration: 300,
      added_at: now,
      updated_at: now,
      is_favorite: 1,
    },
  ];

  for (const t of tracks) {
    await dbExecute(
      `INSERT OR IGNORE INTO track (id, space_id, title, artist, album, duration, added_at, updated_at, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, spaceId, t.title, t.artist, t.album, t.duration, t.added_at, t.updated_at, t.is_favorite],
    );
  }
}

export function MusicHub() {
  const [view, setView] = useState<'library' | 'playlists' | 'search'>('library');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const spaceId = useCurrentSpace();

  const loadMusic = useCallback(async () => {
    try {
      setLoading(true);

      // Check if we need to seed data (if empty)
      const currentTracks = await loadTracksFromDatabase();
      if (currentTracks.length === 0) {
        await seedMusicData(spaceId);
      }

      // Load tracks and playlists from local database
      const loadedTracks = await loadTracksFromDatabase();
      const loadedPlaylists = await loadPlaylistsFromDatabase();

      setTracks(loadedTracks);
      setPlaylists(loadedPlaylists);
    } catch (error) {
      Logger.error('Failed to load music data', { error, spaceId });
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    void loadMusic();
  }, [loadMusic]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMusic();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleTrackPress = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity style={styles.trackItem} onPress={() => handleTrackPress(item)}>
      <View style={styles.trackArtwork}>
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.artworkImage} />
        ) : (
          <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.artworkPlaceholder}>
            <Ionicons name="musical-notes" size={24} color="#FFF" />
          </LinearGradient>
        )}
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <View style={styles.trackMeta}>
        {item.isFavorite && <Ionicons name="heart" size={16} color="#EF4444" style={styles.favoriteIcon} />}
        <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity style={styles.playlistItem}>
      <View style={styles.playlistArtwork}>
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.artworkImage} />
        ) : (
          <LinearGradient
            colors={item.isSmartPlaylist ? ['#10B981', '#059669'] : ['#6366F1', '#8B5CF6']}
            style={styles.artworkPlaceholder}
          >
            <Ionicons name={item.isSmartPlaylist ? 'sparkles' : 'list'} size={28} color="#FFF" />
          </LinearGradient>
        )}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistMeta} numberOfLines={1}>
          {item.trackCount} tracks • {formatTotalDuration(item.duration)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderNowPlaying = () => {
    if (!currentTrack) return null;

    return (
      <View style={styles.nowPlaying}>
        <LinearGradient colors={['#1F2937', '#111827']} style={styles.nowPlayingGradient}>
          <View style={styles.nowPlayingContent}>
            <View style={styles.nowPlayingArtwork}>
              {currentTrack.artworkUrl ? (
                <Image source={{ uri: currentTrack.artworkUrl }} style={styles.nowPlayingImage} />
              ) : (
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.nowPlayingImage}>
                  <Ionicons name="musical-notes" size={32} color="#FFF" />
                </LinearGradient>
              )}
            </View>
            <View style={styles.nowPlayingInfo}>
              <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
            <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.headerTitle}>Music</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* View Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, view === 'library' && styles.tabActive]}
          onPress={() => setView('library')}
        >
          <Text style={[styles.tabText, view === 'library' && styles.tabTextActive]}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'playlists' && styles.tabActive]}
          onPress={() => setView('playlists')}
        >
          <Text style={[styles.tabText, view === 'playlists' && styles.tabTextActive]}>Playlists</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && tracks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : view === 'library' ? (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No tracks yet</Text>
              <Text style={styles.emptySubtext}>Add music to your library to get started</Text>
            </View>
          }
        />
      ) : view === 'playlists' ? (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No playlists yet</Text>
              <Text style={styles.emptySubtext}>Create a playlist to organize your music</Text>
            </View>
          }
        />
      ) : null}

      {/* Now Playing Mini Player */}
      {renderNowPlaying()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  trackArtwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#6B7280',
  },
  trackMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  favoriteIcon: {
    marginBottom: 4,
  },
  trackDuration: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  playlistArtwork: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 16,
    overflow: 'hidden',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  playlistMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlaying: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  nowPlayingGradient: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  nowPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlayingArtwork: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    overflow: 'hidden',
  },
  nowPlayingImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  nowPlayingArtist: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
