/**
 * Castbox Extractor
 *
 * Extracts podcast episodes from Castbox subscriptions and playlists
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Castbox] Extractor loaded for account:', config.accountId);

  // Castbox-specific selectors
  const SELECTORS = {
    // Episode containers
    episode: 'div[class*="episode-"], li[class*="episode-item"]',
    episodeCard: 'div[class*="card-"], article',

    // Episode details
    title: 'h3, h4, div[class*="title-"], a[class*="title-"]',
    podcastName: 'div[class*="podcast-"], span[class*="podcast-"], a[class*="podcast-name"]',
    description: 'div[class*="description-"], p[class*="description-"]',
    thumbnail: 'img[class*="thumbnail-"], img[class*="cover-"]',
    duration: 'span[class*="duration-"], div[class*="duration-"]',
    publishDate: 'span[class*="date-"], time',

    // Player info (for currently playing)
    playerTitle: 'div[class*="player-title-"], h2[class*="playing-title"]',
    playerPodcast: 'div[class*="player-podcast-"], span[class*="playing-podcast"]',
    playerImage: 'img[class*="player-image-"], img[class*="playing-cover"]',
  };

  /**
   * Extract episode ID from element or generate one
   */
  function getEpisodeId(element) {
    // Try to get from data attributes
    const dataId = element.getAttribute('data-id') ||
                  element.getAttribute('data-episode-id') ||
                  element.getAttribute('id');

    if (dataId) return `cb_${dataId}`;

    // Try to get from link
    const link = element.querySelector('a[href*="/episode/"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href?.match(/episode\/([^/?]+)/);
      if (match) return `cb_${match[1]}`;
    }

    // Fallback: generate from title
    const titleEl = element.querySelector(SELECTORS.title);
    const podcastEl = element.querySelector(SELECTORS.podcastName);
    if (titleEl) {
      const title = utils.safeText(titleEl).substring(0, 30);
      const podcast = utils.safeText(podcastEl);
      return `cb_${podcast.replace(/\s/g, '_')}_${title.replace(/\s/g, '_')}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract episode information
   */
  function extractEpisode(element) {
    const titleEl = element.querySelector(SELECTORS.title);
    const podcastEl = element.querySelector(SELECTORS.podcastName);
    const descEl = element.querySelector(SELECTORS.description);
    const thumbnailEl = element.querySelector(SELECTORS.thumbnail);
    const durationEl = element.querySelector(SELECTORS.duration);
    const dateEl = element.querySelector(SELECTORS.publishDate);

    return {
      title: utils.safeText(titleEl),
      podcast: utils.safeText(podcastEl),
      description: utils.safeText(descEl),
      thumbnail: utils.safeAttr(thumbnailEl, 'src'),
      duration: utils.safeText(durationEl),
      publishDate: utils.safeText(dateEl),
    };
  }

  /**
   * Parse duration to seconds
   */
  function parseDuration(durationStr) {
    if (!durationStr) return 0;

    const parts = durationStr.split(':').map(p => parseInt(p, 10));

    // Validate all parts are valid numbers
    if (parts.some(p => !Number.isFinite(p) || p < 0)) {
      return 0;
    }

    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  /**
   * Extract timestamp from publish date
   */
  function extractTimestamp(element) {
    const dateEl = element.querySelector(SELECTORS.publishDate);
    if (dateEl) {
      const datetime = dateEl.getAttribute('datetime');
      if (datetime) {
        return utils.parseTimestamp(datetime);
      }

      // Try parsing the text
      const dateText = utils.safeText(dateEl);
      if (dateText) {
        const date = new Date(dateText);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
    }
    return Date.now();
  }

  /**
   * Extract a single episode as a post
   */
  function extractEpisodePost(episodeElement) {
    const episodeId = getEpisodeId(episodeElement);

    if (utils.isAlreadyExtracted(episodeId)) {
      return null;
    }

    const episode = extractEpisode(episodeElement);
    if (!episode.title) return null; // Skip if no title

    const content = `🎙️ ${episode.title}${episode.podcast ? ` - ${episode.podcast}` : ''}`;
    const fullContent = episode.description
      ? `${content}\n\n${episode.description}`
      : content;

    const media = episode.thumbnail ? [{
      type: 'image',
      url: episode.thumbnail,
      alt: `${episode.title} thumbnail`,
    }] : [];

    const timestamp = extractTimestamp(episodeElement);
    const durationSeconds = parseDuration(episode.duration);

    const post = {
      id: episodeId,
      author: episode.podcast || 'Unknown Podcast',
      handle: episode.podcast || 'podcast',
      content: fullContent,
      contentHtml: `<p>🎙️ <strong>${episode.title}</strong>${episode.podcast ? ` - ${episode.podcast}` : ''}</p>${episode.description ? `<p>${episode.description}</p>` : ''}`,
      media: media,
      metadata: {
        title: episode.title,
        podcast: episode.podcast,
        duration: episode.duration,
        durationSeconds: durationSeconds,
        publishDate: episode.publishDate,
        platform: 'castbox',
        type: 'podcast_episode',
      },
      timestamp,
      type: 'podcast_episode',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all episodes in the current view
   */
  function processEpisodes() {
    const episodeElements = document.querySelectorAll(SELECTORS.episode);
    const cardElements = document.querySelectorAll(SELECTORS.episodeCard);

    const allElements = [...episodeElements, ...cardElements];
    const episodes = [];

    allElements.forEach(episodeEl => {
      try {
        const episode = extractEpisodePost(episodeEl);
        if (episode) {
          episodes.push(episode);
        }
      } catch (err) {
        console.error('[Noteece Castbox] Error extracting episode:', err);
      }
    });

    if (episodes.length > 0) {
      console.log(`[Noteece Castbox] Extracted ${episodes.length} episodes`);
      utils.sendToBackend('posts_batch', episodes);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Castbox] Initializing extractor');

    // Process existing episodes
    processEpisodes();

    // Watch for new episodes
    utils.observeElements(`${SELECTORS.episode}, ${SELECTORS.episodeCard}`, (newEpisodes) => {
      console.log(`[Noteece Castbox] Detected ${newEpisodes.length} new episodes`);
      const extracted = [];

      newEpisodes.forEach(episodeEl => {
        try {
          const episode = extractEpisodePost(episodeEl);
          if (episode) {
            extracted.push(episode);
          }
        } catch (err) {
          console.error('[Noteece Castbox] Error extracting new episode:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan
    setInterval(() => {
      processEpisodes();
    }, 20000); // Every 20 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
