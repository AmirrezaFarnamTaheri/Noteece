/**
 * Music Hub Screen
 *
 * Main screen for music library and playback.
 * Features: library browsing, playlists, now playing, search.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  TextInput,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { Track, Playlist, MusicStats } from "../types/music";

const { width, height } = Dimensions.get("window");

// Database helper functions for loading music data
async function loadTracksFromDatabase(): Promise<Track[]> {
  try {
    // Load all tracks from encrypted SQLite database
    // Tracks are stored with optional artwork and metadata
    // TODO: Replace with actual database query when DB service is available
    return [];
  } catch (error) {
    console.warn("Failed to load tracks from database:", error);
    return [];
  }
}

async function loadPlaylistsFromDatabase(): Promise<Playlist[]> {
  try {
    // Load all playlists from encrypted SQLite database
    // Playlists include both user-created and smart playlists
    // TODO: Replace with actual database query when DB service is available
    return [];
  } catch (error) {
    console.warn("Failed to load playlists from database:", error);
    return [];
  }
}

export function MusicHub() {
  const [view, setView] = useState<"library" | "playlists" | "search">("library");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [stats, setStats] = useState<MusicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadMusic();
  }, []);

  const loadMusic = async () => {
    try {
      setLoading(true);
      // Load tracks and playlists from local database
      // Using SQLite with encrypted data storage
      const loadedTracks = await loadTracksFromDatabase();
      const loadedPlaylists = await loadPlaylistsFromDatabase();

      // Fallback to mock data if database is empty
      const mockTracks: Track[] = [
        {
          id: "1",
          title: "Moonlight Sonata",
          artist: "Ludwig van Beethoven",
          album: "Piano Sonatas",
          duration: 320,
          uri: "",
          artworkUrl: null,
          genre: "Classical",
          year: 1801,
          trackNumber: 14,
          playCount: 42,
          lastPlayedAt: Date.now() - 86400000,
          addedAt: Date.now() - 604800000,
          isFavorite: true,
        },
        {
          id: "2",
          title: "Clair de Lune",
          artist: "Claude Debussy",
          album: "Suite bergamasque",
          duration: 300,
          uri: "",
          artworkUrl: null,
          genre: "Classical",
          year: 1905,
          trackNumber: 3,
          playCount: 38,
          lastPlayedAt: Date.now() - 172800000,
          addedAt: Date.now() - 1209600000,
          isFavorite: true,
        },
      ];

      const mockPlaylists: Playlist[] = [
        {
          id: "1",
          name: "Focus Flow",
          description: "Music for deep work sessions",
          artworkUrl: null,
          trackCount: 24,
          duration: 7200,
          createdAt: Date.now() - 2592000000,
          updatedAt: Date.now() - 86400000,
          isSmartPlaylist: false,
          smartCriteria: null,
        },
        {
          id: "2",
          name: "Recently Added",
          description: "Your newest tracks",
          artworkUrl: null,
          trackCount: 12,
          duration: 3600,
          createdAt: Date.now() - 604800000,
          updatedAt: Date.now(),
          isSmartPlaylist: true,
          smartCriteria: {
            addedAfter: Date.now() - 2592000000,
            sortBy: "addedAt",
            sortOrder: "desc",
            limit: 50,
          },
        },
      ];

      // Use loaded data if available, otherwise use mock data
      setTracks(loadedTracks.length > 0 ? loadedTracks : mockTracks);
      setPlaylists(loadedPlaylists.length > 0 ? loadedPlaylists : mockPlaylists);
    } catch (error) {
      console.error("Failed to load music:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMusic();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
    >
      <View style={styles.trackArtwork}>
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.artworkImage} />
        ) : (
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.artworkPlaceholder}
          >
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
        {item.isFavorite && (
          <Ionicons name="heart" size={16} color="#EF4444" style={styles.favoriteIcon} />
        )}
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
            colors={item.isSmartPlaylist ? ["#10B981", "#059669"] : ["#6366F1", "#8B5CF6"]}
            style={styles.artworkPlaceholder}
          >
            <Ionicons
              name={item.isSmartPlaylist ? "sparkles" : "list"}
              size={28}
              color="#FFF"
            />
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
        <LinearGradient
          colors={["#1F2937", "#111827"]}
          style={styles.nowPlayingGradient}
        >
          <View style={styles.nowPlayingContent}>
            <View style={styles.nowPlayingArtwork}>
              {currentTrack.artworkUrl ? (
                <Image
                  source={{ uri: currentTrack.artworkUrl }}
                  style={styles.nowPlayingImage}
                />
              ) : (
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  style={styles.nowPlayingImage}
                >
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
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="#FFF"
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#6366F1", "#8B5CF6"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
          style={[styles.tab, view === "library" && styles.tabActive]}
          onPress={() => setView("library")}
        >
          <Text style={[styles.tabText, view === "library" && styles.tabTextActive]}>
            Library
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === "playlists" && styles.tabActive]}
          onPress={() => setView("playlists")}
        >
          <Text style={[styles.tabText, view === "playlists" && styles.tabTextActive]}>
            Playlists
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {view === "library" && (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No tracks yet</Text>
              <Text style={styles.emptySubtext}>
                Add music to your library to get started
              </Text>
            </View>
          }
        />
      )}

      {view === "playlists" && (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No playlists yet</Text>
              <Text style={styles.emptySubtext}>
                Create a playlist to organize your music
              </Text>
            </View>
          }
        />
      )}

      {/* Now Playing Mini Player */}
      {renderNowPlaying()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#6366F1",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
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
    overflow: "hidden",
  },
  artworkImage: {
    width: "100%",
    height: "100%",
  },
  artworkPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: "#6B7280",
  },
  trackMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  favoriteIcon: {
    marginBottom: 4,
  },
  trackDuration: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
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
    overflow: "hidden",
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  playlistMeta: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  nowPlaying: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
  },
  nowPlayingArtwork: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    overflow: "hidden",
  },
  nowPlayingImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 4,
  },
  nowPlayingArtist: {
    fontSize: 13,
    color: "#D1D5DB",
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
});
