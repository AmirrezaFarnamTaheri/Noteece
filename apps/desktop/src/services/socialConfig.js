// Social Media Selector Configuration
//
// This file is injected into webviews to configure scraping selectors dynamically.
// It can be updated remotely to handle DOM changes without app updates.

export const socialConfig = {
  version: "1.0.0",
  lastUpdated: Date.now(),
  platforms: {
    twitter: {
      postSelector: "article[data-testid='tweet']",
      authorSelector: "div[data-testid='User-Name']",
      contentSelector: "div[data-testid='tweetText']",
      timestampSelector: "time",
      mediaSelector: "div[data-testid='tweetPhoto'] img, div[data-testid='videoPlayer'] video",
      engagement: {
        likes: "div[data-testid='like']",
        retweets: "div[data-testid='retweet']",
        replies: "div[data-testid='reply']"
      }
    },
    instagram: {
      postSelector: "article._aao7",
      authorSelector: "span._aacl",
      contentSelector: "h1._aacl",
      timestampSelector: "time._aaqe",
      mediaSelector: "div._aagv img"
    },
    linkedin: {
      postSelector: "div.feed-shared-update-v2",
      authorSelector: "span.feed-shared-actor__name",
      contentSelector: "div.feed-shared-update-v2__description-wrapper",
      timestampSelector: "span.feed-shared-actor__sub-description"
    }
  }
};

/**
 * Fetch latest configuration from remote source
 * @param {string} url - The URL to fetch config from
 * @returns {Promise<Object>} - The new configuration object
 */
export async function fetchRemoteConfig(url = "https://raw.githubusercontent.com/noteece/config/main/social_selectors.json") {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch config");
    const config = await response.json();
    return config;
  } catch (error) {
    console.error("Failed to load remote config, using default", error);
    return socialConfig;
  }
}
