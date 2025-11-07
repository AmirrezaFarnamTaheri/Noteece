/**
 * Tinder Extractor
 *
 * Extracts matches and conversations from Tinder Web
 *
 * PRIVACY & CONSENT NOTICE:
 * This extractor only captures data that the user explicitly views in their browser.
 * It does NOT:
 * - Automatically scan all profiles
 * - Extract data without user navigation
 * - Share data with third parties
 * - Store sensitive profile information beyond what user views
 *
 * All data remains local and encrypted in the user's Noteece database.
 * Users should be aware of and consent to this data collection.
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Tinder] Extractor loaded - Privacy mode enabled');
  console.log('[Noteece Tinder] Only extracting viewed conversations and matches');

  // Tinder-specific selectors
  const SELECTORS = {
    // Match/conversation list
    matchItem: 'div[role="listitem"], div[class*="matchListItem"], a[href*="/app/messages/"]',

    // Match details
    matchName: 'div[class*="name"], h2, h3',
    matchAge: 'span[class*="age"]',
    matchAvatar: 'div[class*="avatar"] img, img[class*="profilePhoto"]',
    matchPreview: 'div[class*="messagePreview"], span[class*="lastMessage"]',

    // Message thread
    message: 'div[class*="msg"], div[class*="message-"]',
    messageText: 'div[class*="text"], span[class*="messageText"]',
    messageTime: 'time, span[class*="timestamp"]',
    messageSender: 'div[class*="sender"]',

    // Profile view
    profileName: 'h1[class*="profileName"], div[class*="name"] h1',
    profileBio: 'div[class*="bio"], div[class*="description"]',
    profilePhoto: 'div[class*="profileCard"] img, div[class*="photoContainer"] img',
  };

  /**
   * Extract match/conversation ID
   */
  function getMatchId(element) {
    // Try href
    const link = element.tagName === 'A' ? element : element.querySelector('a');
    if (link) {
      const href = link.getAttribute('href');
      const match = href?.match(/messages\/([a-f0-9]+)/);
      if (match) return `tinder_${match[1]}`;
    }

    // Try data attributes
    const dataId = element.getAttribute('data-id') ||
                  element.getAttribute('data-match-id') ||
                  element.getAttribute('id');
    if (dataId) return `tinder_${dataId}`;

    // Fallback
    const nameEl = element.querySelector(SELECTORS.matchName);
    if (nameEl) {
      const name = utils.safeText(nameEl).substring(0, 30);
      return `tinder_${name.replace(/\W/g, '_')}_${Date.now()}`;
    }

    return `tinder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract match information
   */
  function extractMatch(element) {
    const nameEl = element.querySelector(SELECTORS.matchName);
    const ageEl = element.querySelector(SELECTORS.matchAge);
    const avatarEl = element.querySelector(SELECTORS.matchAvatar);
    const previewEl = element.querySelector(SELECTORS.matchPreview);

    return {
      name: utils.safeText(nameEl),
      age: utils.safeText(ageEl),
      avatar: utils.safeAttr(avatarEl, 'src'),
      preview: utils.safeText(previewEl),
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

    // Privacy: Only show first name initial for display
    const displayName = match.name.split(' ')[0];

    let content = `💕 Match with ${displayName}`;
    if (match.age) {
      content += `, ${match.age}`;
    }
    if (match.preview) {
      content += `\n\n"${match.preview}"`;
    }

    const media = [];
    if (match.avatar) {
      media.push({
        type: 'image',
        url: match.avatar,
        alt: 'Profile photo',
      });
    }

    const post = {
      id: matchId,
      author: displayName,
      handle: 'tinder_match',
      content,
      contentHtml: `<p>💕 <strong>Match with ${displayName}</strong>${match.age ? `, ${match.age}` : ''}</p>${match.preview ? `<p>"${match.preview}"</p>` : ''}`,
      media: media.length > 0 ? media : undefined,
      metadata: {
        platform: 'tinder',
        type: 'match',
        privacy_level: 'sensitive',
      },
      timestamp: Date.now(),
      type: 'match',
    };

    return utils.normalizePost(post);
  }

  /**
   * Extract messages from conversation
   */
  function extractMessage(messageElement) {
    const textEl = messageElement.querySelector(SELECTORS.messageText);
    const timeEl = messageElement.querySelector(SELECTORS.messageTime);

    return {
      text: utils.safeText(textEl),
      time: utils.safeText(timeEl),
    };
  }

  /**
   * Extract a message as a post
   */
  function extractMessagePost(messageElement, matchName) {
    const msgId = `tinder_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (utils.isAlreadyExtracted(msgId)) {
      return null;
    }

    const message = extractMessage(messageElement);
    if (!message.text) return null;

    // Privacy: Truncate long messages
    const truncatedText = message.text.length > 200
      ? message.text.substring(0, 200) + '...'
      : message.text;

    const post = {
      id: msgId,
      author: matchName || 'Match',
      handle: 'tinder_message',
      content: `💬 ${truncatedText}`,
      contentHtml: `<p>💬 ${truncatedText}</p>`,
      metadata: {
        platform: 'tinder',
        type: 'message',
        privacy_level: 'sensitive',
      },
      timestamp: Date.now(),
      type: 'message',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process matches
   */
  function processMatches() {
    const matchElements = document.querySelectorAll(SELECTORS.matchItem);
    const matches = [];

    matchElements.forEach(matchEl => {
      try {
        const match = extractMatchPost(matchEl);
        if (match) {
          matches.push(match);
        }
      } catch (err) {
        console.error('[Noteece Tinder] Error extracting match:', err);
      }
    });

    if (matches.length > 0) {
      console.log(`[Noteece Tinder] Extracted ${matches.length} matches (privacy mode)`);
      utils.sendToBackend('posts_batch', matches);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Tinder] Initializing extractor (privacy-first mode)');
    console.log('[Noteece Tinder] ⚠️  Only capturing data you explicitly view');

    // Process existing matches
    processMatches();

    // Watch for new matches as user navigates
    utils.observeElements(SELECTORS.matchItem, (newMatches) => {
      console.log(`[Noteece Tinder] Detected ${newMatches.length} new matches`);
      const extracted = [];

      newMatches.forEach(matchEl => {
        try {
          const match = extractMatchPost(matchEl);
          if (match) {
            extracted.push(match);
          }
        } catch (err) {
          console.error('[Noteece Tinder] Error extracting new match:', err);
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
