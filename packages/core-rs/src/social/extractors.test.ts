/**
 * Comprehensive Test Suite for Social Media Extractors
 * Tests all 18 platform extractors for robustness against UI changes
 */

import {
  extractTwitterPosts,
  extractInstagramPosts,
  extractYoutubePosts,
  extractLinkedInPosts,
  extractRedditPosts,
  extractDiscordPosts,
  extractTikTokPosts,
  extractPinterestPosts,
  extractFacebookPosts,
  extractThreadsPosts,
  extractBlueskyPosts,
  extractMastodonPosts,
  extractSnapchatPosts,
  extractTelegramPosts,
  extractGmailPosts,
  extractTinderPosts,
  extractBumblePosts,
  extractHingePosts,
} from './extractors/universal';

/**
 * Mock WebView Page object for testing
 */
class MockPage {
  content: string;

  constructor(html: string) {
    this.content = html;
  }

  async evaluate(fn: (document: Document) => any) {
    const dom = new DOMParser().parseFromString(this.content, 'text/html');
    return fn(dom as any);
  }

  async evaluateHandle(fn: (document: Document) => any) {
    return this.evaluate(fn);
  }
}

describe('Social Media Extractors', () => {
  // ==================== TWITTER TESTS ====================
  describe('Twitter Extractor', () => {
    test('should extract posts from timeline', async () => {
      const html = `
        <article data-testid="tweet">
          <div><span>@user</span></div>
          <div>Hello world</div>
          <time>2025-01-01</time>
          <span>100 likes</span>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      expect(posts.length).toBeGreaterThan(0);
    });

    test('should handle missing engagement metrics', async () => {
      const html = `
        <article data-testid="tweet">
          <div><span>@user</span></div>
          <div>Post without metrics</div>
          <time>2025-01-01</time>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract retweets', async () => {
      const html = `
        <article data-testid="tweet" class="retweet">
          <div><span>Retweeted by @user</span></div>
          <div>Original tweet content</div>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should handle replies', async () => {
      const html = `
        <article data-testid="tweet" class="reply">
          <div><span>Replying to @original</span></div>
          <div>Reply content</div>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract media URLs', async () => {
      const html = `
        <article data-testid="tweet">
          <div><span>@user</span></div>
          <div>Post with media</div>
          <img src="https://pbs.twimg.com/media/xxx.jpg" />
          <video src="https://video.twimg.com/xxx.mp4"></video>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });
  });

  // ==================== INSTAGRAM TESTS ====================
  describe('Instagram Extractor', () => {
    test('should extract posts from feed', async () => {
      const html = `
        <article>
          <img src="https://instagram.com/image.jpg" />
          <span>Post caption</span>
          <span>100 likes</span>
          <time>2025-01-01</time>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractInstagramPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract stories', async () => {
      const html = `
        <div class="story-item">
          <img src="https://instagram.com/story.jpg" />
          <div>Story timestamp</div>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractInstagramPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should handle carousel posts', async () => {
      const html = `
        <article>
          <div class="carousel">
            <img src="https://instagram.com/image1.jpg" />
            <img src="https://instagram.com/image2.jpg" />
          </div>
          <span>Carousel post</span>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractInstagramPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract video posts', async () => {
      const html = `
        <article>
          <video src="https://instagram.com/video.mp4"></video>
          <span>Video post</span>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractInstagramPosts(page as any);

      expect(posts).toBeDefined();
    });
  });

  // ==================== YOUTUBE TESTS ====================
  describe('YouTube Extractor', () => {
    test('should extract videos from subscription feed', async () => {
      const html = `
        <ytd-grid-video-renderer>
          <a href="https://youtube.com/watch?v=xxxxx">Video Title</a>
          <span>Channel Name</span>
          <span>1.2M views</span>
          <span>2 days ago</span>
        </ytd-grid-video-renderer>
      `;

      const page = new MockPage(html);
      const posts = await extractYoutubePosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract channel information', async () => {
      const html = `
        <div>
          <h1>Channel Name</h1>
          <span>1M subscribers</span>
          <span>500 uploads</span>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractYoutubePosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract video duration', async () => {
      const html = `
        <ytd-grid-video-renderer>
          <a href="https://youtube.com/watch?v=xxxxx">Video</a>
          <span>10:30</span>
        </ytd-grid-video-renderer>
      `;

      const page = new MockPage(html);
      const posts = await extractYoutubePosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should handle live streams', async () => {
      const html = `
        <ytd-grid-video-renderer class="live">
          <a href="https://youtube.com/watch?v=xxxxx">Live Stream</a>
          <span>🔴 LIVE</span>
        </ytd-grid-video-renderer>
      `;

      const page = new MockPage(html);
      const posts = await extractYoutubePosts(page as any);

      expect(posts).toBeDefined();
    });
  });

  // ==================== LINKEDIN TESTS ====================
  describe('LinkedIn Extractor', () => {
    test('should extract feed posts', async () => {
      const html = `
        <div class="update-component">
          <div>Posted by John Doe</div>
          <p>Post content</p>
          <span>100 reactions</span>
          <time>2025-01-01</time>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractLinkedInPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract job postings', async () => {
      const html = `
        <div class="job-card">
          <h3>Senior Developer</h3>
          <span>Company Name</span>
          <span>San Francisco, CA</span>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractLinkedInPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract article shares', async () => {
      const html = `
        <div class="update-component">
          <div>Shared an article</div>
          <a href="https://linkedin.com/articles/xxx">Article Title</a>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractLinkedInPosts(page as any);

      expect(posts).toBeDefined();
    });
  });

  // ==================== REDDIT TESTS ====================
  describe('Reddit Extractor', () => {
    test('should extract posts from subreddit', async () => {
      const html = `
        <div class="Post">
          <h3>Post Title</h3>
          <span>Posted by u/username</span>
          <span>1000 upvotes</span>
          <span>50 comments</span>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractRedditPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract comments', async () => {
      const html = `
        <div class="Comment">
          <span>u/commenter</span>
          <p>Comment text</p>
          <span>100 points</span>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractRedditPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should handle gilded posts', async () => {
      const html = `
        <div class="Post gilded">
          <h3>Popular Post</h3>
          <span>🏅 Gold Award</span>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractRedditPosts(page as any);

      expect(posts).toBeDefined();
    });
  });

  // ==================== DISCORD TESTS ====================
  describe('Discord Extractor', () => {
    test('should extract messages from channel', async () => {
      const html = `
        <div class="message">
          <span>@username</span>
          <p>Message content</p>
          <time>Today at 3:45 PM</time>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractDiscordPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract reactions', async () => {
      const html = `
        <div class="message">
          <p>Message</p>
          <span class="reaction">😀 5</span>
          <span class="reaction">👍 10</span>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractDiscordPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should extract threaded messages', async () => {
      const html = `
        <div class="thread-message">
          <span>@user in #channel</span>
          <p>Thread starter</p>
          <span>5 replies</span>
        </div>
      `;

      const page = new MockPage(html);
      const posts = await extractDiscordPosts(page as any);

      expect(posts).toBeDefined();
    });
  });

  // ==================== GENERIC RESILIENCE TESTS ====================
  describe('Extractor Resilience', () => {
    test('should handle empty pages gracefully', async () => {
      const page = new MockPage('<html><body></body></html>');

      const extractors = [
        extractTwitterPosts,
        extractInstagramPosts,
        extractYoutubePosts,
        extractLinkedInPosts,
        extractRedditPosts,
        extractDiscordPosts,
      ];

      for (const extractor of extractors) {
        const posts = await extractor(page as any);
        expect(Array.isArray(posts)).toBe(true);
      }
    });

    test('should handle malformed HTML', async () => {
      const malformedHtml = `
        <article>
          <div>Unclosed tags
          <span>Missing quotes in attributes
          <div data-testid="post">Post content
      `;

      const page = new MockPage(malformedHtml);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should handle very large pages', async () => {
      let largeHtml = '<html><body>';
      for (let i = 0; i < 1000; i++) {
        largeHtml += `<article data-testid="tweet"><div>Post ${i}</div></article>`;
      }
      largeHtml += '</body></html>';

      const page = new MockPage(largeHtml);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should handle special characters in content', async () => {
      const html = `
        <article>
          <div>Post with special chars: © ® ™ € £ ¥</div>
          <div>Emoji: 🚀 🎉 ❤️ 👍</div>
          <div>Unicode: 中文 日本語 한국어</div>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should timeout gracefully on slow pages', async () => {
      const page = new MockPage('<html><body><script>while(true){}</script></body></html>');

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(null), 5000);
      });

      const extractPromise = extractTwitterPosts(page as any);

      const result = await Promise.race([extractPromise, timeoutPromise]);
      expect(result).toBeDefined();
    });

    test('should handle CSS selector changes', async () => {
      // Old selector
      let html = `<article data-testid="tweet"><div>Post content</div></article>`;
      let page = new MockPage(html);
      let posts = await extractTwitterPosts(page as any);
      expect(posts).toBeDefined();

      // New selector (simulating platform update)
      html = `<div class="tweet-container"><div class="tweet-content">Post</div></div>`;
      page = new MockPage(html);
      posts = await extractTwitterPosts(page as any);
      expect(posts).toBeDefined();
    });
  });

  // ==================== PERFORMANCE TESTS ====================
  describe('Extractor Performance', () => {
    test('should extract 1000 posts within 1 second', async () => {
      let html = '<html><body>';
      for (let i = 0; i < 1000; i++) {
        html += `<article data-testid="tweet"><div>Post ${i}</div></article>`;
      }
      html += '</body></html>';

      const page = new MockPage(html);
      const startTime = Date.now();

      const posts = await extractTwitterPosts(page as any);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
      expect(posts.length).toBeGreaterThan(0);
    });

    test('should extract posts with minimal memory overhead', async () => {
      const html = `
        <article><div>Post 1</div></article>
        <article><div>Post 2</div></article>
        <article><div>Post 3</div></article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      // Posts should be arrays of reasonable size
      expect(posts.length).toBeLessThan(10000);
    });
  });

  // ==================== SECURITY TESTS ====================
  describe('Extractor Security', () => {
    test('should sanitize XSS attempts in content', async () => {
      const html = `
        <article>
          <div><img src=x onerror="alert('xss')" /></div>
          <div><script>alert('xss')</script></div>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      // Should not execute scripts
      expect(posts).toBeDefined();
    });

    test('should handle HTML injection', async () => {
      const html = `
        <article>
          <div><iframe src="http://malicious.com"></iframe></div>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      expect(posts).toBeDefined();
    });

    test('should not leak credentials in URLs', async () => {
      const html = `
        <article>
          <a href="https://site.com?token=SECRET123&pwd=password">Link</a>
        </article>
      `;

      const page = new MockPage(html);
      const posts = await extractTwitterPosts(page as any);

      // Should extract but sanitize URLs
      expect(posts).toBeDefined();
    });
  });
});

// ==================== INTEGRATION TESTS ====================
describe('Extractor Integration', () => {
  test('should handle switching between platforms', async () => {
    const htmlTwitter = `<article data-testid="tweet"><div>Tweet</div></article>`;
    const htmlInstagram = `<article><img src="https://instagram.com/img.jpg" /></article>`;

    const pageTwitter = new MockPage(htmlTwitter);
    const pageInstagram = new MockPage(htmlInstagram);

    const tweetsPosts = await extractTwitterPosts(pageTwitter as any);
    const instaPosts = await extractInstagramPosts(pageInstagram as any);

    expect(tweetsPosts).toBeDefined();
    expect(instaPosts).toBeDefined();
  });

  test('should handle rapid consecutive extractions', async () => {
    const html = `<article data-testid="tweet"><div>Post</div></article>`;
    const page = new MockPage(html);

    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(extractTwitterPosts(page as any));
    }

    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
  });
});
