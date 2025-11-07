/**
 * Twitter/X Extractor
 *
 * Extracts tweets, engagement metrics, and media from Twitter/X
 */

(function() {
    'use strict';

    if (!window.__NOTEECE__) {
        console.error('[Noteece] Universal extractor not loaded');
        return;
    }

    console.log('[Noteece] Twitter extractor loaded');

    const { utils } = window.__NOTEECE__;

    /**
     * Extract tweet ID from various sources
     */
    function getTweetId(tweetElement) {
        // Try data attribute
        const statusLink = tweetElement.querySelector('a[href*="/status/"]');
        if (statusLink) {
            const match = statusLink.href.match(/\/status\/(\d+)/);
            if (match) return match[1];
        }

        // Try article data-testid
        const testId = tweetElement.getAttribute('data-testid');
        if (testId && testId.includes('tweet')) {
            // Extract from child links
            const links = tweetElement.querySelectorAll('a[href*="/status/"]');
            for (const link of links) {
                const match = link.href.match(/\/status\/(\d+)/);
                if (match) return match[1];
            }
        }

        return null;
    }

    /**
     * Extract author information
     */
    function extractAuthor(tweetElement) {
        // Author name
        const nameElement = tweetElement.querySelector('[data-testid="User-Name"]');
        const fullText = nameElement?.textContent || '';

        // Split into name and handle
        const parts = fullText.split('@');
        const name = parts[0]?.trim() || 'Unknown';
        const handle = parts[1]?.split('·')[0]?.trim() || null;

        return { name, handle };
    }

    /**
     * Extract tweet content
     */
    function extractContent(tweetElement) {
        const contentElement = tweetElement.querySelector('[data-testid="tweetText"]');
        if (!contentElement) return { text: null, html: null };

        return {
            text: contentElement.textContent?.trim() || null,
            html: contentElement.innerHTML || null,
        };
    }

    /**
     * Extract engagement metrics
     */
    function extractEngagement(tweetElement) {
        const engagement = {
            likes: null,
            retweets: null,
            replies: null,
            views: null,
        };

        // Helper to parse count from button
        function parseButton(testId) {
            const button = tweetElement.querySelector(`[data-testid="${testId}"]`);
            if (!button) return null;

            const label = button.getAttribute('aria-label');
            if (!label) return null;

            return utils.parseEngagement(label);
        }

        engagement.likes = parseButton('like');
        engagement.retweets = parseButton('retweet');
        engagement.replies = parseButton('reply');

        // Views are in a separate element
        const viewsElement = tweetElement.querySelector('[href$="/analytics"]');
        if (viewsElement) {
            const viewsText = viewsElement.textContent;
            engagement.views = utils.parseEngagement(viewsText);
        }

        return engagement;
    }

    /**
     * Check if tweet is a retweet
     */
    function isRetweet(tweetElement) {
        return !!tweetElement.querySelector('[data-testid="socialContext"]');
    }

    /**
     * Check if tweet is a reply
     */
    function isReply(tweetElement) {
        return !!tweetElement.querySelector('[data-testid="inReplyTo"]');
    }

    /**
     * Check if tweet is a quote tweet
     */
    function hasQuotedTweet(tweetElement) {
        return !!tweetElement.querySelector('[data-testid="card.wrapper"]');
    }

    /**
     * Extract a single tweet
     */
    function extractTweet(tweetElement) {
        const id = getTweetId(tweetElement);
        if (!id) return null;

        // Create globally unique ID with platform prefix
        const globalId = `twitter-${id}`;

        // Skip if already extracted
        if (utils.isAlreadyExtracted(globalId)) {
            return null;
        }

        const author = extractAuthor(tweetElement);
        const content = extractContent(tweetElement);
        const engagement = extractEngagement(tweetElement);
        const media = utils.extractMedia(tweetElement);
        const timestamp = utils.parseTimestamp(tweetElement);

        // Determine tweet type
        let type = 'tweet';
        if (isRetweet(tweetElement)) type = 'retweet';
        else if (isReply(tweetElement)) type = 'reply';
        else if (hasQuotedTweet(tweetElement)) type = 'quote';

        return utils.normalizePost({
            id: globalId,  // Use globally unique ID
            author: author.name,
            handle: author.handle ? `@${author.handle}` : null,
            content: content.text,
            contentHtml: content.html,
            media: [...media.images, ...media.videos],
            timestamp,
            likes: engagement.likes,
            shares: engagement.retweets,
            comments: engagement.replies,
            views: engagement.views,
            type,
        });
    }

    /**
     * Extract all visible tweets
     */
    function extractAllTweets() {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        const extracted = [];

        tweets.forEach(tweetElement => {
            const tweet = extractTweet(tweetElement);
            if (tweet) {
                extracted.push(tweet);
            }
        });

        if (extracted.length > 0) {
            utils.queueData(extracted);
            console.log(`[Noteece] Extracted ${extracted.length} tweets`);
        }
    }

    /**
     * Start extraction
     */
    function startExtraction() {
        console.log('[Noteece] Starting Twitter extraction');

        // Initial extraction
        extractAllTweets();

        // Observe for new tweets
        utils.observeElements('article[data-testid="tweet"]', () => {
            extractAllTweets();
        }, {
            checkInterval: window.__NOTEECE__.config.pollInterval,
        });

        // Flush queue when leaving page
        window.addEventListener('beforeunload', () => {
            utils.flushQueue();
        });
    }

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startExtraction);
    } else {
        startExtraction();
    }

    console.log('[Noteece] Twitter extractor initialized');
})();
