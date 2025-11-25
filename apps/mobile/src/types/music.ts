/**
 * Music Hub Types
 *
 * Type definitions for music library, playlists, and playback.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number; // in seconds
  uri: string; // file path or URL
  artworkUrl: string | null;
  genre: string | null;
  year: number | null;
  trackNumber: number | null;
  playCount: number;
  lastPlayedAt: number | null;
  addedAt: number;
  isFavorite: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  artworkUrl: string | null;
  trackCount: number;
  duration: number; // total duration in seconds
  createdAt: number;
  updatedAt: number;
  isSmartPlaylist: boolean;
  smartCriteria: SmartPlaylistCriteria | null;
}

export interface SmartPlaylistCriteria {
  genre?: string;
  artist?: string;
  minPlayCount?: number;
  maxDuration?: number;
  isFavorite?: boolean;
  addedAfter?: number;
  sortBy?: 'title' | 'artist' | 'playCount' | 'addedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface PlaylistTrack {
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number; // current position in seconds
  queue: Track[];
  queueIndex: number;
  repeatMode: 'off' | 'one' | 'all';
  shuffleEnabled: boolean;
  volume: number; // 0.0 to 1.0
}

export interface MusicStats {
  totalTracks: number;
  totalPlaylists: number;
  totalDuration: number;
  totalPlayCount: number;
  favoriteCount: number;
  genreBreakdown: GenreStats[];
  topArtists: ArtistStats[];
  recentlyPlayed: Track[];
}

export interface GenreStats {
  genre: string;
  count: number;
  duration: number;
}

export interface ArtistStats {
  artist: string;
  trackCount: number;
  playCount: number;
}
