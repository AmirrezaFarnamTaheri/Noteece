/**
 * Pinterest Extractor
 *
 * Extracts pins from Pinterest home feed, boards, and search results
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Pinterest] Extractor loaded for account:', config.accountId);

  // Pinterest-specific selectors
  const SELECTORS = {
    // Pin containers
    pinContainer: 'div[data-test-id="pin"], div[data-test-id="pinWrapper"]',

    // Pin details
    image: 'img[alt], img[src*="pinimg"]',
    video: 'video',
    title: 'h1, div[data-test-id="pin-title"]',
    description: 'div[data-test-id="pin-description"], div[class*="description"]',
    link: 'a[href*="/pin/"]',
    author: 'div[data-test-id="creator-profile-name"], a[data-test-id="creator-profile-link"]',
    avatar: 'img[data-test-id="creator-avatar"]',

    // Engagement
    saveButton: 'button[data-test-id="pin-save-button"]',
    saveCount: 'div[data-test-id="save-count"]',

    // Board info
    boardName: 'div[data-test-id="board-name"]',
    boardLink: 'a[href*="/boards/"]',
  };

  /**
   * Extract pin ID from URL
   */
  function getPinId(element) {
    const linkEl = element.querySelector(SELECTORS.link);
    if (!linkEl) return null;

    const href = linkEl.getAttribute('href');
    if (!href) return null;

    // Extract pin ID from /pin/PIN_ID/
    const match = href.match(/\/pin\/(\d+)/);
    if (match) return match[1];

    return null;
  }

  /**
   * Extract author information
   */
  function extractAuthor(element) {
    const authorEl = element.querySelector(SELECTORS.author);
    const avatarEl = element.querySelector(SELECTORS.avatar);

    return {
      name: utils.safeText(authorEl),
      avatar: utils.safeAttr(avatarEl, 'src'),
      url: authorEl?.getAttribute('href') ? `https://pinterest.com${authorEl.getAttribute('href')}` : null,
    };
  }

  /**
   * Extract board information
   */
  function extractBoard(element) {
    const boardNameEl = element.querySelector(SELECTORS.boardName);
    const boardLinkEl = element.querySelector(SELECTORS.boardLink);

    if (!boardNameEl) return null;

    return {
      name: utils.safeText(boardNameEl),
      url: boardLinkEl ? `https://pinterest.com${boardLinkEl.getAttribute('href')}` : null,
    };
  }

  /**
   * Extract media (images or videos)
   */
  function extractMedia(element) {
    const media = [];

    // Check for video first
    const videoEl = element.querySelector(SELECTORS.video);
    if (videoEl) {
      media.push({
        type: 'video',
        url: videoEl.getAttribute('src') || '',
        poster: videoEl.getAttribute('poster'),
      });
      return media;
    }

    // Extract image
    const imageEl = element.querySelector(SELECTORS.image);
    if (imageEl) {
      const src = imageEl.getAttribute('src');
      const srcset = imageEl.getAttribute('srcset');

      // Prefer highest quality from srcset
      let imageUrl = src;
      if (srcset) {
        const sources = srcset.split(',').map(s => s.trim().split(' '));
        // Get the last one (usually highest quality)
        const highestQuality = sources[sources.length - 1];
        if (highestQuality && highestQuality[0]) {
          imageUrl = highestQuality[0];
        }
      }

      media.push({
        type: 'image',
        url: imageUrl,
        alt: imageEl.getAttribute('alt'),
      });
    }

    return media;
  }

  /**
   * Extract engagement metrics
   */
  function extractEngagement(element) {
    const saveCountEl = element.querySelector(SELECTORS.saveCount);

    return {
      saves: utils.parseEngagement(utils.safeText(saveCountEl)),
      hasSaveButton: !!element.querySelector(SELECTORS.saveButton),
    };
  }

  /**
   * Extract a single pin
   */
  function extractPin(pinElement) {
    const pinId = getPinId(pinElement);
    if (!pinId || utils.isAlreadyExtracted(pinId)) {
      return null;
    }

    const titleEl = pinElement.querySelector(SELECTORS.title);
    const descEl = pinElement.querySelector(SELECTORS.description);

    const title = utils.safeText(titleEl);
    const description = utils.safeText(descEl);

    const author = extractAuthor(pinElement);
    const board = extractBoard(pinElement);
    const media = extractMedia(pinElement);
    const engagement = extractEngagement(pinElement);

    // Skip if no media
    if (media.length === 0) return null;

    const pin = {
      id: pinId,
      author: author.name || 'Unknown',
      handle: author.name,
      content: title || description || '',
      contentHtml: title ? `<h3>${title}</h3>${description ? `<p>${description}</p>` : ''}` : `<p>${description}</p>`,
      url: `https://pinterest.com/pin/${pinId}`,
      media: media,
      metadata: {
        avatar: author.avatar,
        authorUrl: author.url,
        board: board,
        saves: engagement.saves,
      },
      timestamp: Date.now(), // Pinterest doesn't expose timestamps easily
      type: media[0].type === 'video' ? 'video' : 'image_post',
    };

    return utils.normalizePost(pin);
  }

  /**
   * Process all pins in the current view
   */
  function processPins() {
    const pinElements = document.querySelectorAll(SELECTORS.pinContainer);
    const pins = [];

    pinElements.forEach(pinEl => {
      try {
        const pin = extractPin(pinEl);
        if (pin) {
          pins.push(pin);
        }
      } catch (err) {
        console.error('[Noteece Pinterest] Error extracting pin:', err);
      }
    });

    if (pins.length > 0) {
      console.log(`[Noteece Pinterest] Extracted ${pins.length} pins`);
      utils.sendToBackend('posts_batch', pins);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Pinterest] Initializing extractor');

    // Process existing pins
    processPins();

    // Watch for new pins being loaded (masonry infinite scroll)
    utils.observeElements(SELECTORS.pinContainer, (newPins) => {
      console.log(`[Noteece Pinterest] Detected ${newPins.length} new pins`);
      const extracted = [];

      newPins.forEach(pinEl => {
        try {
          const pin = extractPin(pinEl);
          if (pin) {
            extracted.push(pin);
          }
        } catch (err) {
          console.error('[Noteece Pinterest] Error extracting new pin:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan (Pinterest has aggressive infinite scroll)
    setInterval(() => {
      processPins();
    }, 8000); // Every 8 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
