import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography, spacing } from "@/lib/theme";
import {
  MUSIC_LIBRARY,
  Track,
  getTracksByGenre,
} from "@/lib/music-service";
import { isValidMusicUrl } from "@/lib/music-security";

type GenreFilter =
  | "all"
  | "lofi"
  | "ambient"
  | "instrumental"
  | "classical"
  | "electronic"
  | "nature"
  | "meditation"
  | "jazz"
  | "cinematic";

export default function MusicLabScreen() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [filter, setFilter] = useState<GenreFilter>("all");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize audio mode
  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error("Failed to setup audio:", error);
      }
    }

    setupAudio();

    // Cleanup on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Update playback status
  useEffect(() => {
    if (!sound) return;

    const updateStatus = async () => {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis || 0);

        if (status.didJustFinish) {
          // Auto-play next track
          playNextTrack();
        }
      }
    };

    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [sound, currentTrack]);

  const playTrack = async (track: Track) => {
    try {
      // Validate URL against allowlist for security
      if (!isValidMusicUrl(track.url)) {
        console.error("Blocked music URL from untrusted domain:", track.url);
        Alert.alert(
          "Security Error",
          "This track is from an untrusted source and cannot be played. Only music from verified royalty-free sources is allowed.",
        );
        return;
      }

      // Stop current track if playing
      if (sound) {
        await sound.unloadAsync();
      }

      // Load and play new track
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true },
      );

      setSound(newSound);
      setCurrentTrack(track);
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to play track:", error);
      Alert.alert("Error", "Failed to play track. Please try again.");
    }
  };

  const togglePlayPause = async () => {
    if (!sound || !currentTrack) {
      // Play first track if nothing is playing
      const firstTrack = filteredTracks[0];
      if (firstTrack) {
        await playTrack(firstTrack);
      }
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  };

  const playNextTrack = () => {
    if (!currentTrack || !filteredTracks || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === currentTrack.id,
    );
    if (currentIndex === -1) {
      // Current track not in filtered list, fallback to first track
      return playTrack(filteredTracks[0]);
    }
    const nextIndex = (currentIndex + 1) % filteredTracks.length;
    playTrack(filteredTracks[nextIndex]);
  };

  const playPreviousTrack = () => {
    if (!currentTrack || !filteredTracks || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === currentTrack.id,
    );
    if (currentIndex === -1) {
      // Current track not in filtered list, fallback to last track
      return playTrack(filteredTracks[filteredTracks.length - 1]);
    }
    const previousIndex =
      currentIndex === 0 ? filteredTracks.length - 1 : currentIndex - 1;
    playTrack(filteredTracks[previousIndex]);
  };

  const formatTime = (millis: number) => {
    // Guard against invalid input that could cause NaN display
    if (!Number.isFinite(millis) || millis < 0) return "0:00";

    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const filteredTracks = getTracksByGenre(filter);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <LinearGradient
        colors={["#0A0E27", "#1E2235", "#2D1B3E", "#1E2235", "#0A0E27"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Music Lab</Text>
              <Text style={styles.subtitle}>Focus & Relax</Text>
            </View>
            <View style={styles.genreIcon}>
              <Ionicons name="musical-notes" size={32} color={colors.primary} />
            </View>
          </View>

          {/* Currently Playing */}
          {currentTrack && (
            <View style={styles.nowPlaying}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.nowPlayingGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.nowPlayingContent}>
                  <View style={styles.nowPlayingInfo}>
                    <Ionicons
                      name={isPlaying ? "radio" : "pause-circle"}
                      size={48}
                      color="#FFFFFF"
                    />
                    <View style={styles.nowPlayingText}>
                      <Text style={styles.nowPlayingTitle}>
                        {currentTrack.title}
                      </Text>
                      <Text style={styles.nowPlayingArtist}>
                        {currentTrack.artist}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                duration > 0 ? (position / duration) * 100 : 0,
                              ),
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressTime}>
                      <Text style={styles.progressTimeText}>
                        {formatTime(position)}
                      </Text>
                      <Text style={styles.progressTimeText}>
                        {formatTime(duration)}
                      </Text>
                    </View>
                  </View>

                  {/* Playback Controls */}
                  <View style={styles.controls}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={playPreviousTrack}
                    >
                      <Ionicons
                        name="play-skip-back"
                        size={32}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.controlButtonPrimary}
                      onPress={togglePlayPause}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={40}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={playNextTrack}
                    >
                      <Ionicons
                        name="play-skip-forward"
                        size={32}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Filter Tabs - Scrollable Genres */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "all" && styles.filterButtonActive,
              ]}
              onPress={() => setFilter("all")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === "all" && styles.filterButtonTextActive,
                ]}
              >
                All ({MUSIC_LIBRARY.length})
              </Text>
            </TouchableOpacity>

            {[
              { key: "lofi", label: "Lo-Fi", icon: "🎵" },
              { key: "ambient", label: "Ambient", icon: "🌊" },
              { key: "instrumental", label: "Focus", icon: "🎹" },
              { key: "classical", label: "Classical", icon: "🎻" },
              { key: "electronic", label: "Electronic", icon: "⚡" },
              { key: "meditation", label: "Meditation", icon: "🧘" },
              { key: "nature", label: "Nature", icon: "🌿" },
              { key: "jazz", label: "Jazz", icon: "🎺" },
              { key: "cinematic", label: "Cinematic", icon: "🎬" },
            ].map((genre) => (
              <TouchableOpacity
                key={genre.key}
                style={[
                  styles.filterButton,
                  filter === genre.key && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(genre.key as GenreFilter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === genre.key && styles.filterButtonTextActive,
                  ]}
                >
                  {genre.icon} {genre.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Track List */}
          <View style={styles.trackList}>
            {filteredTracks.map((track) => (
              <TouchableOpacity
                key={track.id}
                style={[
                  styles.trackCard,
                  currentTrack?.id === track.id && styles.trackCardActive,
                ]}
                onPress={() => playTrack(track)}
              >
                <View style={styles.trackInfo}>
                  <View
                    style={[
                      styles.trackIcon,
                      currentTrack?.id === track.id && styles.trackIconActive,
                    ]}
                  >
                    <Ionicons
                      name={
                        currentTrack?.id === track.id && isPlaying
                          ? "radio"
                          : "musical-note"
                      }
                      size={24}
                      color={
                        currentTrack?.id === track.id
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>

                  <View style={styles.trackText}>
                    <Text
                      style={[
                        styles.trackTitle,
                        currentTrack?.id === track.id &&
                          styles.trackTitleActive,
                      ]}
                    >
                      {track.title}
                    </Text>
                    <View style={styles.trackMeta}>
                      <Text style={styles.trackArtist}>{track.artist}</Text>
                      <View style={styles.trackGenreBadge}>
                        <Text style={styles.trackGenreText}>
                          {track.genre === "lofi"
                            ? "🎵 Lo-Fi"
                            : track.genre === "ambient"
                              ? "🌊 Ambient"
                              : track.genre === "instrumental"
                                ? "🎹 Focus"
                                : track.genre === "classical"
                                  ? "🎻 Classical"
                                  : track.genre === "electronic"
                                    ? "⚡ Electronic"
                                    : track.genre === "meditation"
                                      ? "🧘 Meditation"
                                      : track.genre === "nature"
                                        ? "🌿 Nature"
                                        : track.genre === "jazz"
                                          ? "🎺 Jazz"
                                          : track.genre === "cinematic"
                                            ? "🎬 Cinematic"
                                            : track.genre}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.trackDuration}>
                  {Math.floor(track.duration / 60)}:
                  {(track.duration % 60).toString().padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Library Stats */}
          <View style={styles.infoCard}>
            <Ionicons name="musical-notes" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Music Library</Text>
              <Text style={styles.infoText}>
                {MUSIC_LIBRARY.length} tracks across 9 genres • Royalty-free
                music from Incompetech, Bensound & Free Music Archive
              </Text>
              <Text
                style={[
                  styles.infoText,
                  { marginTop: spacing.xs, fontSize: typography.fontSize.xs },
                ]}
              >
                🎵 Background playback • 🔄 Auto-play next • 📱 Controls lock
                screen
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  genreIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlaying: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 20,
    overflow: "hidden",
  },
  nowPlayingGradient: {
    padding: spacing.lg,
  },
  nowPlayingContent: {
    gap: spacing.lg,
  },
  nowPlayingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nowPlayingText: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: "#FFFFFF",
    marginBottom: spacing.xs,
  },
  nowPlayingArtist: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255, 255, 255, 0.8)",
  },
  progressContainer: {
    gap: spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  progressTime: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTimeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255, 255, 255, 0.8)",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonPrimary: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  trackList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackCardActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
  },
  trackInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  trackIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  trackIconActive: {
    backgroundColor: `${colors.primary}20`,
  },
  trackText: {
    flex: 1,
  },
  trackTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  trackTitleActive: {
    color: colors.primary,
  },
  trackMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  trackArtist: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  trackGenreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
  },
  trackGenreText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  trackDuration: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textTertiary,
    marginLeft: spacing.md,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.sm * 1.5,
  },
});
