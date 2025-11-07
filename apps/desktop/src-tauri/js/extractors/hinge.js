/**
 * Hinge Extractor
 *
 * Extracts matches and conversations from Hinge Web
 *
 * PRIVACY & CONSENT NOTICE:
 * This extractor respects user privacy and only captures viewed data.
 * All data remains local and encrypted. Users must consent to collection.
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Hinge] Extractor loaded - Privacy mode enabled');

  // Hinge-specific selectors
  const SELECTORS = {
    // Match/conversation items
    match: 'div[class*="match"], div[class*="conversation"], li[class*="chat-"]',

    // Match details
    name: 'div[class*="name"], h2, h3',
    age: 'span[class*="age"]',
    photo: 'img[class*="photo"], img[class*="profile"]',
    preview: 'div[class*="preview"], span[class*="message"]',
    time: 'time, span[class*="time"]',

    // Profile prompts (Hinge-specific)
    prompt: 'div[class*="prompt"], div[class*="answer"]',

    // Messages
    message: 'div[class*="message"], div[class*="chat-bubble"]',
    messageText: 'div[class*="text"], p',
  };

  /**
   * Extract match ID
   */
  function getMatchId(element) {
    const dataId = element.getAttribute('data-id') ||
                  element.getAttribute('data-match-id') ||
                  element.getAttribute('id');

    if (dataId) return `hinge_${dataId}`;

    const nameEl = element.querySelector(SELECTORS.name);
    if (nameEl) {
      const name = utils.safeText(nameEl).substring(0, 30);
      return `hinge_${name.replace(/\W/g, '_')}_${Date.now()}`;
    }

    return `hinge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract match information
   */
  function extractMatch(element) {
    const nameEl = element.querySelector(SELECTORS.name);
    const ageEl = element.querySelector(SELECTORS.age);
    const photoEl = element.querySelector(SELECTORS.photo);
    const previewEl = element.querySelector(SELECTORS.preview);
    const timeEl = element.querySelector(SELECTORS.time);
    const promptEls = element.querySelectorAll(SELECTORS.prompt);

    const prompts = [];
    promptEls.forEach(promptEl => {
      const promptText = utils.safeText(promptEl);
      if (promptText) prompts.push(promptText);
    });

    return {
      name: utils.safeText(nameEl),
      age: utils.safeText(ageEl),
      photo: utils.safeAttr(photoEl, 'src'),
      preview: utils.safeText(previewEl),
      time: utils.safeText(timeEl),
      prompts: prompts.slice(0, 2), // Limit to 2 prompts for privacy
    };
  }

  /**
   * Extract a match as a post
   */
  function extractMatchPost(matchElement) {
    const matchId = getMatchId(matchElement);

    if (utils.isAlreadyExtracted(matchId)) {
      return null;
    }

    const match = extractMatch(matchElement);
    if (!match.name) return null;

    // Privacy: Only show first name
    const displayName = match.name.split(' ')[0];

    let content = `💝 Match with ${displayName}`;
    if (match.age) {
      content += `, ${match.age}`;
    }
    if (match.preview) {
      content += `\n\n"${match.preview}"`;
    }
    if (match.prompts.length > 0) {
      content += `\n\n🔸 ${match.prompts[0]}`;
    }

    const media = [];
    if (match.photo) {
      media.push({
        type: 'image',
        url: match.photo,
        alt: 'Profile photo',
      });
    }

    const post = {
      id: matchId,
      author: displayName,
      handle: 'hinge_match',
      content,
      contentHtml: `<p>💝 <strong>Match with ${displayName}</strong>${match.age ? `, ${match.age}` : ''}</p>${match.preview ? `<p>"${match.preview}"</p>` : ''}${match.prompts.length > 0 ? `<p>🔸 ${match.prompts[0]}</p>` : ''}`,
      media: media.length > 0 ? media : undefined,
      metadata: {
        platform: 'hinge',
        type: 'match',
        privacy_level: 'sensitive',
      },
      timestamp: Date.now(),
      type: 'match',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process matches
   */
  function processMatches() {
    const matchElements = document.querySelectorAll(SELECTORS.match);
    const matches = [];

    matchElements.forEach(matchEl => {
      try {
        const match = extractMatchPost(matchEl);
        if (match) {
          matches.push(match);
        }
      } catch (err) {
        console.error('[Noteece Hinge] Error extracting match:', err);
      }
    });

    if (matches.length > 0) {
      console.log(`[Noteece Hinge] Extracted ${matches.length} matches (privacy mode)`);
      utils.sendToBackend('posts_batch', matches);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Hinge] Initializing extractor (privacy-first mode)');
    console.log('[Noteece Hinge] ⚠️  Only capturing data you explicitly view');

    // Process existing matches
    processMatches();

    // Watch for new matches
    utils.observeElements(SELECTORS.match, (newMatches) => {
      console.log(`[Noteece Hinge] Detected ${newMatches.length} new matches`);
      const extracted = [];

      newMatches.forEach(matchEl => {
        try {
          const match = extractMatchPost(matchEl);
          if (match) {
            extracted.push(match);
          }
        } catch (err) {
          console.error('[Noteece Hinge] Error extracting new match:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Less frequent scanning for privacy
    setInterval(() => {
      processMatches();
    }, 60000); // Every 60 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
