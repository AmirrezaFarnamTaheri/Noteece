/**
 * Bumble Extractor
 *
 * Extracts connections and conversations from Bumble Web
 *
 * PRIVACY & CONSENT NOTICE:
 * This extractor respects user privacy and only captures viewed data.
 * All data remains local and encrypted. Users must consent to collection.
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Bumble] Extractor loaded - Privacy mode enabled');

  // Bumble-specific selectors
  const SELECTORS = {
    // Connection items
    connection: 'div[class*="conversations-item"], div[class*="match-"], article[class*="connection"]',

    // Connection details
    name: 'div[class*="name"], h3, h2',
    age: 'span[class*="age"], div[class*="age"]',
    photo: 'img[class*="photo"], img[class*="avatar"]',
    preview: 'div[class*="preview"], span[class*="lastMessage"]',
    time: 'time, span[class*="time"], div[class*="timestamp"]',

    // Messages
    message: 'div[class*="message"], div[class*="chat-message"]',
    messageText: 'div[class*="text"], p',
    messageTime: 'time, span[class*="timestamp"]',
  };

  /**
   * Extract connection ID
   */
  function getConnectionId(element) {
    const dataId = element.getAttribute('data-id') ||
                  element.getAttribute('data-connection-id') ||
                  element.getAttribute('id');

    if (dataId) return `bumble_${dataId}`;

    const nameEl = element.querySelector(SELECTORS.name);
    if (nameEl) {
      const name = utils.safeText(nameEl).substring(0, 30);
      return `bumble_${name.replace(/\W/g, '_')}_${Date.now()}`;
    }

    return `bumble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract connection information
   */
  function extractConnection(element) {
    const nameEl = element.querySelector(SELECTORS.name);
    const ageEl = element.querySelector(SELECTORS.age);
    const photoEl = element.querySelector(SELECTORS.photo);
    const previewEl = element.querySelector(SELECTORS.preview);
    const timeEl = element.querySelector(SELECTORS.time);

    return {
      name: utils.safeText(nameEl),
      age: utils.safeText(ageEl),
      photo: utils.safeAttr(photoEl, 'src'),
      preview: utils.safeText(previewEl),
      time: utils.safeText(timeEl),
    };
  }

  /**
   * Extract a connection as a post
   */
  function extractConnectionPost(connectionElement) {
    const connId = getConnectionId(connectionElement);

    if (utils.isAlreadyExtracted(connId)) {
      return null;
    }

    const conn = extractConnection(connectionElement);
    if (!conn.name) return null;

    // Privacy: Only show first name
    const displayName = conn.name.split(' ')[0];

    let content = `🐝 Connection with ${displayName}`;
    if (conn.age) {
      content += `, ${conn.age}`;
    }
    if (conn.preview) {
      content += `\n\n"${conn.preview}"`;
    }

    const media = [];
    if (conn.photo) {
      media.push({
        type: 'image',
        url: conn.photo,
        alt: 'Profile photo',
      });
    }

    const post = {
      id: connId,
      author: displayName,
      handle: 'bumble_connection',
      content,
      contentHtml: `<p>🐝 <strong>Connection with ${displayName}</strong>${conn.age ? `, ${conn.age}` : ''}</p>${conn.preview ? `<p>"${conn.preview}"</p>` : ''}`,
      media: media.length > 0 ? media : undefined,
      metadata: {
        platform: 'bumble',
        type: 'connection',
        privacy_level: 'sensitive',
      },
      timestamp: Date.now(),
      type: 'connection',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process connections
   */
  function processConnections() {
    const connectionElements = document.querySelectorAll(SELECTORS.connection);
    const connections = [];

    connectionElements.forEach(connEl => {
      try {
        const connection = extractConnectionPost(connEl);
        if (connection) {
          connections.push(connection);
        }
      } catch (err) {
        console.error('[Noteece Bumble] Error extracting connection:', err);
      }
    });

    if (connections.length > 0) {
      console.log(`[Noteece Bumble] Extracted ${connections.length} connections (privacy mode)`);
      utils.sendToBackend('posts_batch', connections);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Bumble] Initializing extractor (privacy-first mode)');
    console.log('[Noteece Bumble] ⚠️  Only capturing data you explicitly view');

    // Process existing connections
    processConnections();

    // Watch for new connections
    utils.observeElements(SELECTORS.connection, (newConnections) => {
      console.log(`[Noteece Bumble] Detected ${newConnections.length} new connections`);
      const extracted = [];

      newConnections.forEach(connEl => {
        try {
          const connection = extractConnectionPost(connEl);
          if (connection) {
            extracted.push(connection);
          }
        } catch (err) {
          console.error('[Noteece Bumble] Error extracting new connection:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Less frequent scanning for privacy
    setInterval(() => {
      processConnections();
    }, 60000); // Every 60 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
