/**
 * Universal Social Media Extractor Framework
 *
 * This script is injected into social media WebViews to extract content.
 * It provides a common interface for all platform-specific extractors.
 */

(function() {
    'use strict';

    // Check if already loaded
    if (window.__NOTEECE_EXTRACTOR_LOADED__) {
        console.log('[Noteece] Extractor already loaded, skipping');
        return;
    }
    window.__NOTEECE_EXTRACTOR_LOADED__ = true;

    console.log('[Noteece] Universal Extractor loaded');

    // Configuration (injected by Rust)
    window.__NOTEECE_CONFIG__ = window.__NOTEECE_CONFIG__ || {
        accountId: null,
        platform: null,
        pollInterval: 5000, // 5 seconds
        debug: true,
    };

    // Storage for extracted IDs to prevent duplicates
    const extractedIds = new Set();

    // Message queue for batch sending
    let messageQueue = [];
    let sendTimeout = null;

    /**
     * Send data to Rust backend via Tauri
     */
    async function sendToBackend(eventType, data) {
        if (!window.__TAURI__) {
            console.warn('[Noteece] Tauri API not available');
            return;
        }

        try {
            await window.__TAURI__.invoke('handle_extracted_data', {
                accountId: window.__NOTEECE_CONFIG__.accountId,
                platform: window.__NOTEECE_CONFIG__.platform,
                eventType,
                data: JSON.stringify(data),
            });

            if (window.__NOTEECE_CONFIG__.debug) {
                console.log(`[Noteece] Sent ${eventType}:`, data);
            }
        } catch (error) {
            console.error('[Noteece] Failed to send data:', error);
        }
    }

    /**
     * Queue data for batch sending
     */
    function queueData(items) {
        messageQueue.push(...items);

        // Clear existing timeout
        if (sendTimeout) {
            clearTimeout(sendTimeout);
        }

        // Send after 2 seconds of no new data, or when queue reaches 10 items
        if (messageQueue.length >= 10) {
            flushQueue();
        } else {
            sendTimeout = setTimeout(flushQueue, 2000);
        }
    }

    /**
     * Flush queued messages to backend
     */
    async function flushQueue() {
        if (messageQueue.length === 0) return;

        const batch = messageQueue.splice(0, messageQueue.length);
        await sendToBackend('posts_batch', batch);
    }

    /**
     * Generic element observer
     */
    function observeElements(selector, callback, options = {}) {
        const { checkInterval = 1000, rootElement = document.body } = options;

        let lastCount = 0;

        const check = () => {
            const elements = rootElement.querySelectorAll(selector);
            if (elements.length !== lastCount) {
                lastCount = elements.length;
                callback(elements);
            }
        };

        // Initial check
        check();

        // Periodic checks
        const intervalId = setInterval(check, checkInterval);

        // Also observe DOM mutations
        const observer = new MutationObserver(check);
        observer.observe(rootElement, {
            childList: true,
            subtree: true,
        });

        return () => {
            clearInterval(intervalId);
            observer.disconnect();
        };
    }

    /**
     * Safe text extraction
     */
    function safeText(element, selector) {
        if (!element) return null;
        const target = selector ? element.querySelector(selector) : element;
        return target?.textContent?.trim() || null;
    }

    /**
     * Safe attribute extraction
     */
    function safeAttr(element, selector, attr) {
        if (!element) return null;
        const target = selector ? element.querySelector(selector) : element;
        return target?.getAttribute(attr) || null;
    }

    /**
     * Parse timestamp from various formats
     * Always returns milliseconds since epoch
     */
    function parseTimestamp(element) {
        // Try <time> element with datetime attribute
        const timeElement = element.querySelector('time[datetime]');
        if (timeElement) {
            const datetime = timeElement.getAttribute('datetime');
            const timestamp = new Date(datetime).getTime();
            // Validate that the result is a valid, finite number
            if (Number.isFinite(timestamp) && !Number.isNaN(timestamp)) {
                return timestamp; // Already in milliseconds
            }
        }

        // Try data attributes
        const dataTime = element.getAttribute('data-time') ||
                        element.getAttribute('data-timestamp');
        if (dataTime) {
            const parsed = parseInt(dataTime);
            // Validate that parsing succeeded
            if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
                // Detect if timestamp is in seconds (< year 2100 in seconds)
                if (parsed < 4102444800) {
                    return parsed * 1000; // Convert seconds to milliseconds
                }
                return parsed; // Already in milliseconds
            }
        }

        // Fallback to current time
        return Date.now(); // Already in milliseconds
    }

    /**
     * Parse engagement numbers (handles "1.2K", "1M", etc.)
     */
    function parseEngagement(text) {
        if (!text) return null;

        const cleaned = text.replace(/,/g, '').trim().toLowerCase();
        const match = cleaned.match(/([\d.]+)([km]?)/);

        if (!match) return null;

        let number = parseFloat(match[1]);

        // Validate number is finite before processing
        if (!Number.isFinite(number) || number < 0) {
            return null;
        }

        const suffix = match[2];

        if (suffix === 'k') number *= 1000;
        if (suffix === 'm') number *= 1000000;

        return Math.floor(number);
    }

    /**
     * Extract media URLs from element
     */
    function extractMedia(element) {
        const media = {
            images: [],
            videos: [],
        };

        // Images
        const images = element.querySelectorAll('img[src*="media"], img[src*="cdn"]');
        images.forEach(img => {
            const src = img.src || img.getAttribute('data-src');
            if (src && !src.includes('profile') && !src.includes('avatar')) {
                media.images.push(src);
            }
        });

        // Videos
        const videos = element.querySelectorAll('video[src], video source[src]');
        videos.forEach(video => {
            const src = video.src || video.getAttribute('data-src');
            if (src) {
                media.videos.push(src);
            }
        });

        return media;
    }

    /**
     * Check if ID already extracted
     */
    function isAlreadyExtracted(id) {
        if (extractedIds.has(id)) {
            return true;
        }
        extractedIds.add(id);
        return false;
    }

    /**
     * Normalize post data
     * All timestamps are in milliseconds since epoch
     */
    function normalizePost(rawData) {
        let timestamp = rawData.timestamp || Date.now();

        // Ensure timestamp is in milliseconds (detect seconds and convert)
        if (timestamp < 4102444800) {
            timestamp = timestamp * 1000;
        }

        return {
            platform_post_id: rawData.id || null,
            author: rawData.author || 'Unknown',
            author_handle: rawData.handle || null,
            content: rawData.content || null,
            content_html: rawData.contentHtml || null,
            media_urls: rawData.media || [],
            timestamp: timestamp,
            engagement: {
                likes: rawData.likes || null,
                shares: rawData.shares || null,
                comments: rawData.comments || null,
                views: rawData.views || null,
            },
            post_type: rawData.type || null,
            reply_to: rawData.replyTo || null,
        };
    }

    // Export utilities to platform-specific extractors
    window.__NOTEECE__ = {
        config: window.__NOTEECE_CONFIG__,
        utils: {
            sendToBackend,
            queueData,
            flushQueue,
            observeElements,
            safeText,
            safeAttr,
            parseTimestamp,
            parseEngagement,
            extractMedia,
            isAlreadyExtracted,
            normalizePost,
        },
    };

    console.log('[Noteece] Extractor framework ready');

    // Load platform-specific extractor
    const platform = window.__NOTEECE_CONFIG__.platform;
    if (platform) {
        console.log(`[Noteece] Loading ${platform} extractor`);
        // Platform-specific code will be concatenated after this
    }
})();
