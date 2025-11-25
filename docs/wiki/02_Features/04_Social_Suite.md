# Social Suite

## Reclaim Your Attention

The Social Suite is a unique feature of Noteece that allows you to engage with social media on **your terms**. Instead of doom-scrolling infinite feeds, use Noteece to aggregate and analyze specific content.

## Features

### 1. Aggregator

- **Platforms:** Twitter/X, Reddit, YouTube, LinkedIn.
- **Unified Feed:** See posts from different platforms in a single, chronological timeline.
- **Filtering:** Aggressively filter out ads, "suggested" posts, and noise.

### 2. Local Scraping

Noteece does not use official, limited APIs that require expensive developer keys. Instead, it uses a local scraping engine (`universal.js`) that runs within a hidden webview.

- **Privacy:** Your browsing data stays on your machine.
- **Resilience:** If a platform changes its CSS, the scraper definitions can be updated via a remote config file without updating the whole app.

### 3. Social Analytics

Track your own engagement metrics if you are a creator.

- **Growth:** Follower counts over time.
- **Engagement:** Likes, comments, and shares aggregated across platforms.

## Limitations

- **Read-Only (Mostly):** The suite is primarily for consumption and analysis. Posting capabilities are limited to basic text updates.
- **Login Required:** You must be logged in to the respective platforms in the hidden webview for the scraper to access your feed.
