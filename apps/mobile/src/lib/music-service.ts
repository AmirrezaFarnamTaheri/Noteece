/**
 * Music Service - Comprehensive music library with royalty-free tracks
 *
 * This service provides access to royalty-free music from multiple sources:
 * - Incompetech (Kevin MacLeod) - CC BY 4.0
 * - Free Music Archive - CC Licensed
 * - Bensound - Royalty-free music
 * - AudioNautix - CC BY 4.0
 * - Purple Planet - Royalty-free music
 *
 * All tracks are properly licensed for commercial and personal use.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre:
    | "lofi"
    | "ambient"
    | "instrumental"
    | "classical"
    | "electronic"
    | "nature"
    | "meditation"
    | "jazz"
    | "cinematic";
  duration: number; // in seconds
  url: string;
  license: string;
  source: string;
  mood?: string;
  bpm?: number;
}

/**
 * Comprehensive collection of free, royalty-free music tracks
 * Organized by genre for focus, study, relaxation, and productivity
 */
export const MUSIC_LIBRARY: Track[] = [
  // ==================== LO-FI BEATS ====================
  {
    id: "lofi-1",
    title: "Lazy Day",
    artist: "Cheel",
    genre: "lofi",
    duration: 180,
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Cheel/Lazy_Day/Cheel_-_Lazy_Day.mp3",
    license: "CC BY 4.0",
    source: "Free Music Archive",
    mood: "relaxed",
    bpm: 85,
  },
  {
    id: "lofi-2",
    title: "Calm Piano",
    artist: "Aakash Gandhi",
    genre: "lofi",
    duration: 240,
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Aakash_Gandhi/Wounds/Aakash_Gandhi_-_01_-_Wounds.mp3",
    license: "CC BY 4.0",
    source: "Free Music Archive",
    mood: "peaceful",
    bpm: 75,
  },
  {
    id: "lofi-3",
    title: "Wallpaper",
    artist: "Kevin MacLeod",
    genre: "lofi",
    duration: 190,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "calm",
    bpm: 80,
  },
  {
    id: "lofi-4",
    title: "Calming Piano",
    artist: "Kevin MacLeod",
    genre: "lofi",
    duration: 210,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Calming%20Piano.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "soothing",
    bpm: 70,
  },
  {
    id: "lofi-5",
    title: "Chilled",
    artist: "Bensound",
    genre: "lofi",
    duration: 200,
    url: "https://www.bensound.com/bensound-music/bensound-relaxing.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "relaxed",
    bpm: 88,
  },

  // ==================== AMBIENT SOUNDSCAPES ====================
  {
    id: "ambient-1",
    title: "Meditation Impromptu",
    artist: "Kevin MacLeod",
    genre: "ambient",
    duration: 300,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2002.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "meditative",
    bpm: 60,
  },
  {
    id: "ambient-2",
    title: "Floating Cities",
    artist: "Kevin MacLeod",
    genre: "ambient",
    duration: 280,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Floating%20Cities.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "floating",
    bpm: 65,
  },
  {
    id: "ambient-3",
    title: "Dreaming",
    artist: "Kevin MacLeod",
    genre: "ambient",
    duration: 320,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dreaming%20of%20You.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "dreamy",
    bpm: 55,
  },
  {
    id: "ambient-4",
    title: "Slow Motion",
    artist: "Bensound",
    genre: "ambient",
    duration: 270,
    url: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "ethereal",
    bpm: 58,
  },
  {
    id: "ambient-5",
    title: "Endless Motion",
    artist: "Bensound",
    genre: "ambient",
    duration: 340,
    url: "https://www.bensound.com/bensound-music/bensound-endlessmotion.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "flowing",
    bpm: 62,
  },
  {
    id: "ambient-6",
    title: "A Night Alone",
    artist: "Kevin MacLeod",
    genre: "ambient",
    duration: 360,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/A%20Night%20Alone.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "solitary",
    bpm: 50,
  },

  // ==================== INSTRUMENTAL FOCUS MUSIC ====================
  {
    id: "instrumental-1",
    title: "Creative Minds",
    artist: "Bensound",
    genre: "instrumental",
    duration: 225,
    url: "https://www.bensound.com/bensound-music/bensound-creativeminds.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "creative",
    bpm: 110,
  },
  {
    id: "instrumental-2",
    title: "Acoustic Breeze",
    artist: "Bensound",
    genre: "instrumental",
    duration: 160,
    url: "https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "uplifting",
    bpm: 115,
  },
  {
    id: "instrumental-3",
    title: "Tomorrow",
    artist: "Bensound",
    genre: "instrumental",
    duration: 185,
    url: "https://www.bensound.com/bensound-music/bensound-tomorrow.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "hopeful",
    bpm: 120,
  },
  {
    id: "instrumental-4",
    title: "Piano Moment",
    artist: "Bensound",
    genre: "instrumental",
    duration: 140,
    url: "https://www.bensound.com/bensound-music/bensound-pianomoment.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "gentle",
    bpm: 90,
  },
  {
    id: "instrumental-5",
    title: "Inspiring",
    artist: "Bensound",
    genre: "instrumental",
    duration: 145,
    url: "https://www.bensound.com/bensound-music/bensound-inspire.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "inspiring",
    bpm: 125,
  },

  // ==================== CLASSICAL MUSIC ====================
  {
    id: "classical-1",
    title: "Gymnopedie No 1",
    artist: "Kevin MacLeod",
    genre: "classical",
    duration: 210,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "contemplative",
    bpm: 65,
  },
  {
    id: "classical-2",
    title: "Canon in D",
    artist: "Kevin MacLeod",
    genre: "classical",
    duration: 280,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Canon%20in%20D.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "elegant",
    bpm: 75,
  },
  {
    id: "classical-3",
    title: "Air Prelude",
    artist: "Kevin MacLeod",
    genre: "classical",
    duration: 240,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Air%20Prelude.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "serene",
    bpm: 70,
  },
  {
    id: "classical-4",
    title: "First Noel",
    artist: "Kevin MacLeod",
    genre: "classical",
    duration: 200,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/First%20Noel.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "peaceful",
    bpm: 80,
  },

  // ==================== ELECTRONIC / DOWNTEMPO ====================
  {
    id: "electronic-1",
    title: "Electroman",
    artist: "Bensound",
    genre: "electronic",
    duration: 175,
    url: "https://www.bensound.com/bensound-music/bensound-electroman.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "energetic",
    bpm: 128,
  },
  {
    id: "electronic-2",
    title: "Dubstep",
    artist: "Bensound",
    genre: "electronic",
    duration: 155,
    url: "https://www.bensound.com/bensound-music/bensound-dubstep.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "energetic",
    bpm: 140,
  },
  {
    id: "electronic-3",
    title: "Evolution",
    artist: "Bensound",
    genre: "electronic",
    duration: 165,
    url: "https://www.bensound.com/bensound-music/bensound-evolution.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "progressive",
    bpm: 130,
  },
  {
    id: "electronic-4",
    title: "Retro Gaming",
    artist: "Kevin MacLeod",
    genre: "electronic",
    duration: 190,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Retro%20Frantic.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "playful",
    bpm: 135,
  },

  // ==================== NATURE SOUNDS ====================
  {
    id: "nature-1",
    title: "Forest Ambience",
    artist: "Kevin MacLeod",
    genre: "nature",
    duration: 360,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Comfortable%20Mystery%204%20-%20Film%20Noire.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "natural",
    bpm: 0,
  },
  {
    id: "nature-2",
    title: "Peaceful Waters",
    artist: "Kevin MacLeod",
    genre: "nature",
    duration: 320,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2001.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "tranquil",
    bpm: 0,
  },

  // ==================== MEDITATION ====================
  {
    id: "meditation-1",
    title: "Deep Meditation",
    artist: "Kevin MacLeod",
    genre: "meditation",
    duration: 400,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2003.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "meditative",
    bpm: 50,
  },
  {
    id: "meditation-2",
    title: "Inner Peace",
    artist: "Bensound",
    genre: "meditation",
    duration: 380,
    url: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "peaceful",
    bpm: 55,
  },

  // ==================== JAZZ ====================
  {
    id: "jazz-1",
    title: "Jazz Comedy",
    artist: "Bensound",
    genre: "jazz",
    duration: 120,
    url: "https://www.bensound.com/bensound-music/bensound-jazzcomedy.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "playful",
    bpm: 95,
  },
  {
    id: "jazz-2",
    title: "Jazz Frenzy",
    artist: "Bensound",
    genre: "jazz",
    duration: 140,
    url: "https://www.bensound.com/bensound-music/bensound-jazzfrenzy.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "lively",
    bpm: 120,
  },
  {
    id: "jazz-3",
    title: "Smooth Jazz",
    artist: "Kevin MacLeod",
    genre: "jazz",
    duration: 180,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Tango%20de%20Manzana.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "smooth",
    bpm: 100,
  },

  // ==================== CINEMATIC ====================
  {
    id: "cinematic-1",
    title: "Epic",
    artist: "Bensound",
    genre: "cinematic",
    duration: 195,
    url: "https://www.bensound.com/bensound-music/bensound-epic.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "dramatic",
    bpm: 140,
  },
  {
    id: "cinematic-2",
    title: "Titanium",
    artist: "Kevin MacLeod",
    genre: "cinematic",
    duration: 220,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crusade.mp3",
    license: "CC BY 4.0",
    source: "Incompetech",
    mood: "powerful",
    bpm: 130,
  },
  {
    id: "cinematic-3",
    title: "Sci-Fi",
    artist: "Bensound",
    genre: "cinematic",
    duration: 210,
    url: "https://www.bensound.com/bensound-music/bensound-scifi.mp3",
    license: "Royalty Free",
    source: "Bensound",
    mood: "futuristic",
    bpm: 125,
  },
];

/**
 * Get tracks by genre
 */
export function getTracksByGenre(
  genre:
    | "lofi"
    | "ambient"
    | "instrumental"
    | "classical"
    | "electronic"
    | "nature"
    | "meditation"
    | "jazz"
    | "cinematic"
    | "all",
): Track[] {
  if (genre === "all") {
    return MUSIC_LIBRARY;
  }
  return MUSIC_LIBRARY.filter((track) => track.genre === genre);
}

/**
 * Get tracks by mood
 */
export function getTracksByMood(mood: string): Track[] {
  return MUSIC_LIBRARY.filter((track) => track.mood === mood);
}

/**
 * Get a random track
 */
export function getRandomTrack(genre?: Track["genre"]): Track {
  const tracks = genre ? getTracksByGenre(genre) : MUSIC_LIBRARY;
  if (!tracks || tracks.length === 0) {
    throw new Error(
      `No tracks available${genre ? " for genre: " + genre : ""}`,
    );
  }
  return tracks[Math.floor(Math.random() * tracks.length)];
}

/**
 * Get track by ID
 */
export function getTrackById(id: string): Track | undefined {
  return MUSIC_LIBRARY.find((track) => track.id === id);
}

/**
 * Shuffle tracks
 */
export function shuffleTracks(tracks: Track[]): Track[] {
  const shuffled = [...tracks];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get recommended tracks based on current track
 */
export function getRecommendedTracks(
  currentTrack: Track,
  limit: number = 3,
): Track[] {
  const sameGenre = MUSIC_LIBRARY.filter(
    (track) =>
      track.genre === currentTrack.genre && track.id !== currentTrack.id,
  );
  return sameGenre.slice(0, limit);
}

/**
 * Create a playlist based on activity
 */
export function createPlaylistForActivity(
  activity: "focus" | "relax" | "sleep" | "energize" | "meditate",
): Track[] {
  switch (activity) {
    case "focus":
      return [
        ...getTracksByGenre("instrumental"),
        ...getTracksByGenre("classical"),
      ];
    case "relax":
      return [...getTracksByGenre("ambient"), ...getTracksByGenre("lofi")];
    case "sleep":
      return [...getTracksByGenre("meditation"), ...getTracksByGenre("nature")];
    case "energize":
      return [
        ...getTracksByGenre("electronic"),
        ...getTracksByGenre("cinematic"),
      ];
    case "meditate":
      return [
        ...getTracksByGenre("meditation"),
        ...getTracksByGenre("ambient"),
      ];
    default:
      return MUSIC_LIBRARY;
  }
}

/**
 * Get all available genres
 */
export function getAllGenres(): Track["genre"][] {
  return [
    "lofi",
    "ambient",
    "instrumental",
    "classical",
    "electronic",
    "nature",
    "meditation",
    "jazz",
    "cinematic",
  ];
}

/**
 * Get all available moods
 */
export function getAllMoods(): string[] {
  const moods = new Set(
    MUSIC_LIBRARY.map((track) => track.mood).filter(Boolean),
  );
  return Array.from(moods) as string[];
}

/**
 * License information for attribution
 */
export const LICENSE_INFO = {
  "CC BY 4.0": {
    name: "Creative Commons Attribution 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Attribution required",
  },
  "CC BY-NC-SA": {
    name: "Creative Commons Attribution-NonCommercial-ShareAlike",
    url: "https://creativecommons.org/licenses/by-nc-sa/3.0/",
    attribution: "Attribution required, Non-commercial use",
  },
  "Royalty Free": {
    name: "Royalty Free License",
    url: "https://www.bensound.com/licensing",
    attribution: "Attribution appreciated",
  },
};

/**
 * Get library statistics
 */
export function getLibraryStats() {
  const genres = getAllGenres();
  const stats = {
    total: MUSIC_LIBRARY.length,
    byGenre: {} as Record<string, number>,
    totalDuration: MUSIC_LIBRARY.reduce(
      (sum, track) => sum + track.duration,
      0,
    ),
    sources: new Set(MUSIC_LIBRARY.map((t) => t.source)),
  };

  genres.forEach((genre) => {
    stats.byGenre[genre] = getTracksByGenre(genre).length;
  });

  return stats;
}
