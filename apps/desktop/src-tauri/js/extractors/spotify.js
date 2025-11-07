/**
 * Spotify Extractor
 *
 * Extracts playlists, recently played, and liked songs from Spotify
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Spotify] Extractor loaded for account:', config.accountId);

  // Spotify-specific selectors
  const SELECTORS = {
    // Track rows
    trackRow: 'div[data-testid="tracklist-row"], div[role="row"]',

    // Track details
    trackName: 'a[data-testid="internal-track-link"], div[data-testid="entityTitle"]',
    artistName: 'a[href*="/artist/"], span[data-testid="entity-link"]',
    albumCover: 'img[data-testid="cover-art-image"], img[data-testid="card-image"]',
    duration: 'div[data-testid="duration-cell"]',

    // Playlist info
    playlistTitle: 'h1[data-testid="entityTitle"]',
    playlistDescription: 'span[data-testid="playlist-description"]',

    // Recently played
    recentlyPlayedCard: 'div[data-testid="card-container"]',
    cardTitle: 'div[data-testid="card-title"]',
    cardSubtitle: 'div[data-testid="card-subtitle"]',

    // Liked songs
    likedSongButton: 'button[data-testid="add-button"]',
  };

  /**
   * Extract track ID from Spotify URL or generate one
   */
  function getTrackId(element) {
    // Try to get from track link
    const trackLink = element.querySelector(SELECTORS.trackName);
    if (trackLink) {
      const href = trackLink.getAttribute('href');
      const match = href?.match(/\/track\/([a-zA-Z0-9]+)/);
      if (match) return match[1];
    }

    // Fallback: generate ID
    const trackName = utils.safeText(element.querySelector(SELECTORS.trackName));
    const artistName = utils.safeText(element.querySelector(SELECTORS.artistName));
    if (trackName && artistName) {
      return `sp_${artistName.replace(/\s/g, '_')}_${trackName.replace(/\s/g, '_')}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract track information
   */
  function extractTrack(element) {
    const trackNameEl = element.querySelector(SELECTORS.trackName);
    const artistNameEl = element.querySelector(SELECTORS.artistName);
    const albumCoverEl = element.querySelector(SELECTORS.albumCover);
    const durationEl = element.querySelector(SELECTORS.duration);

    const trackName = utils.safeText(trackNameEl);
    const artistName = utils.safeText(artistNameEl);

    return {
      name: trackName,
      artist: artistName,
      cover: utils.safeAttr(albumCoverEl, 'src'),
      duration: utils.safeText(durationEl),
      url: trackNameEl?.getAttribute('href') ? `https://open.spotify.com${trackNameEl.getAttribute('href')}` : null,
    };
  }

  /**
   * Get current playlist/context information
   */
  function getCurrentContext() {
    const titleEl = document.querySelector(SELECTORS.playlistTitle);
    const descEl = document.querySelector(SELECTORS.playlistDescription);

    return {
      title: utils.safeText(titleEl),
      description: utils.safeText(descEl),
    };
  }

  /**
   * Extract a single track as a post
   */
  function extractTrackPost(trackElement) {
    const trackId = getTrackId(trackElement);

    if (utils.isAlreadyExtracted(trackId)) {
      return null;
    }

    const track = extractTrack(trackElement);
    if (!track.name || !track.artist) return null; // Skip if incomplete

    const context = getCurrentContext();

    const content = `🎵 ${track.name} by ${track.artist}`;
    const media = track.cover ? [{
      type: 'image',
      url: track.cover,
      alt: `${track.name} album cover`,
    }] : [];

    const post = {
      id: trackId,
      author: track.artist,
      handle: track.artist,
      content: content,
      contentHtml: `<p>🎵 <strong>${track.name}</strong> by ${track.artist}</p>`,
      url: track.url,
      media: media,
      metadata: {
        trackName: track.name,
        artistName: track.artist,
        duration: track.duration,
        context: context.title,
        contextDescription: context.description,
        platform: 'spotify',
      },
      timestamp: Date.now(),
      type: 'track',
    };

    return utils.normalizePost(post);
  }

  /**
   * Extract recently played card
   */
  function extractRecentCard(cardElement) {
    const cardId = `sp_recent_${Math.random().toString(36).substr(2, 9)}`;

    if (utils.isAlreadyExtracted(cardId)) {
      return null;
    }

    const titleEl = cardElement.querySelector(SELECTORS.cardTitle);
    const subtitleEl = cardElement.querySelector(SELECTORS.cardSubtitle);
    const coverEl = cardElement.querySelector(SELECTORS.albumCover);

    const title = utils.safeText(titleEl);
    const subtitle = utils.safeText(subtitleEl);

    if (!title) return null;

    const content = `🎵 ${title}${subtitle ? ` - ${subtitle}` : ''}`;
    const media = coverEl ? [{
      type: 'image',
      url: utils.safeAttr(coverEl, 'src'),
      alt: `${title} cover`,
    }] : [];

    const post = {
      id: cardId,
      author: subtitle || 'Spotify',
      handle: 'spotify',
      content: content,
      contentHtml: `<p>🎵 <strong>${title}</strong>${subtitle ? ` - ${subtitle}` : ''}</p>`,
      media: media,
      metadata: {
        title: title,
        subtitle: subtitle,
        type: 'recently_played',
        platform: 'spotify',
      },
      timestamp: Date.now(),
      type: 'recently_played',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all tracks in the current view
   */
  function processTracks() {
    const trackElements = document.querySelectorAll(SELECTORS.trackRow);
    const tracks = [];

    trackElements.forEach(trackEl => {
      try {
        const track = extractTrackPost(trackEl);
        if (track) {
          tracks.push(track);
        }
      } catch (err) {
        console.error('[Noteece Spotify] Error extracting track:', err);
      }
    });

    if (tracks.length > 0) {
      console.log(`[Noteece Spotify] Extracted ${tracks.length} tracks`);
      utils.sendToBackend('posts_batch', tracks);
    }
  }

  /**
   * Process recently played cards
   */
  function processRecentCards() {
    const cardElements = document.querySelectorAll(SELECTORS.recentlyPlayedCard);
    const cards = [];

    cardElements.forEach(cardEl => {
      try {
        const card = extractRecentCard(cardEl);
        if (card) {
          cards.push(card);
        }
      } catch (err) {
        console.error('[Noteece Spotify] Error extracting card:', err);
      }
    });

    if (cards.length > 0) {
      console.log(`[Noteece Spotify] Extracted ${cards.length} recent items`);
      utils.sendToBackend('posts_batch', cards);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Spotify] Initializing extractor');

    // Process existing tracks
    processTracks();
    processRecentCards();

    // Watch for new tracks
    utils.observeElements(SELECTORS.trackRow, (newTracks) => {
      console.log(`[Noteece Spotify] Detected ${newTracks.length} new tracks`);
      const extracted = [];

      newTracks.forEach(trackEl => {
        try {
          const track = extractTrackPost(trackEl);
          if (track) {
            extracted.push(track);
          }
        } catch (err) {
          console.error('[Noteece Spotify] Error extracting new track:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Watch for recently played cards
    utils.observeElements(SELECTORS.recentlyPlayedCard, (newCards) => {
      console.log(`[Noteece Spotify] Detected ${newCards.length} new recent items`);
      const extracted = [];

      newCards.forEach(cardEl => {
        try {
          const card = extractRecentCard(cardEl);
          if (card) {
            extracted.push(card);
          }
        } catch (err) {
          console.error('[Noteece Spotify] Error extracting new card:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan
    setInterval(() => {
      processTracks();
      processRecentCards();
    }, 15000); // Every 15 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
