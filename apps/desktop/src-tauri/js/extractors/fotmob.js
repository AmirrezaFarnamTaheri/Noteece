/**
 * FotMob Extractor
 *
 * Extracts soccer/football match scores, results, and updates
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece FotMob] Extractor loaded for account:', config.accountId);

  // FotMob-specific selectors
  const SELECTORS = {
    // Match containers
    match: 'div[class*="MatchList"], li[class*="match-"], div[data-testid*="match"]',
    matchCard: 'div[class*="MatchCard"], article[class*="match"]',

    // Match details
    homeTeam: 'div[class*="home-"], span[class*="homeTeam"]',
    awayTeam: 'div[class*="away-"], span[class*="awayTeam"]',
    score: 'div[class*="score-"], span[class*="Score"]',
    homeScore: 'span[class*="homeScore"], div[class*="home-score"]',
    awayScore: 'span[class*="awayScore"], div[class*="away-score"]',
    status: 'span[class*="status-"], div[class*="MatchStatus"]',
    time: 'time, span[class*="time-"], div[class*="MatchTime"]',
    competition: 'div[class*="league"], span[class*="competition"], a[class*="tournament"]',
    venue: 'span[class*="venue-"], div[class*="stadium"]',

    // Team logos
    homeLogo: 'img[class*="home"][class*="logo"], img[class*="homeTeam"]',
    awayLogo: 'img[class*="away"][class*="logo"], img[class*="awayTeam"]',
  };

  /**
   * Extract match ID from element or generate one
   */
  function getMatchId(element) {
    // Try to get from data attributes
    const dataId = element.getAttribute('data-id') ||
                  element.getAttribute('data-match-id') ||
                  element.getAttribute('id');

    if (dataId) return `fm_${dataId}`;

    // Try to get from link
    const link = element.querySelector('a[href*="/match/"], a[href*="/matches/"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href?.match(/match(?:es)?\/([^/?]+)/);
      if (match) return `fm_${match[1]}`;
    }

    // Fallback: generate from teams
    const homeTeam = element.querySelector(SELECTORS.homeTeam);
    const awayTeam = element.querySelector(SELECTORS.awayTeam);
    if (homeTeam && awayTeam) {
      const home = utils.safeText(homeTeam).substring(0, 20);
      const away = utils.safeText(awayTeam).substring(0, 20);
      return `fm_${home.replace(/\s/g, '_')}_vs_${away.replace(/\s/g, '_')}_${Date.now()}`;
    }

    return `fm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract match information
   */
  function extractMatch(element) {
    const homeTeamEl = element.querySelector(SELECTORS.homeTeam);
    const awayTeamEl = element.querySelector(SELECTORS.awayTeam);
    const homeScoreEl = element.querySelector(SELECTORS.homeScore);
    const awayScoreEl = element.querySelector(SELECTORS.awayScore);
    const statusEl = element.querySelector(SELECTORS.status);
    const timeEl = element.querySelector(SELECTORS.time);
    const competitionEl = element.querySelector(SELECTORS.competition);
    const venueEl = element.querySelector(SELECTORS.venue);
    const homeLogoEl = element.querySelector(SELECTORS.homeLogo);
    const awayLogoEl = element.querySelector(SELECTORS.awayLogo);

    // Try to find scores in a combined score element if individual scores not found
    let homeScore = utils.safeText(homeScoreEl);
    let awayScore = utils.safeText(awayScoreEl);

    if (!homeScore || !awayScore) {
      const scoreEl = element.querySelector(SELECTORS.score);
      if (scoreEl) {
        const scoreText = utils.safeText(scoreEl);
        const scoreMatch = scoreText.match(/(\d+)\s*[-:]\s*(\d+)/);
        if (scoreMatch) {
          homeScore = scoreMatch[1];
          awayScore = scoreMatch[2];
        }
      }
    }

    return {
      homeTeam: utils.safeText(homeTeamEl),
      awayTeam: utils.safeText(awayTeamEl),
      homeScore,
      awayScore,
      status: utils.safeText(statusEl),
      time: utils.safeText(timeEl),
      competition: utils.safeText(competitionEl),
      venue: utils.safeText(venueEl),
      homeLogo: utils.safeAttr(homeLogoEl, 'src'),
      awayLogo: utils.safeAttr(awayLogoEl, 'src'),
    };
  }

  /**
   * Parse match status
   */
  function parseMatchStatus(statusText) {
    const lower = statusText.toLowerCase();
    if (lower.includes('live') || lower.includes('\'')) return 'live';
    if (lower.includes('ft') || lower.includes('finished') || lower.includes('full time')) return 'finished';
    if (lower.includes('ht') || lower.includes('half time')) return 'halftime';
    if (lower.includes('scheduled') || lower.includes('upcoming')) return 'scheduled';
    if (lower.includes('postponed')) return 'postponed';
    if (lower.includes('cancelled')) return 'cancelled';
    return 'unknown';
  }

  /**
   * Extract timestamp from time element
   */
  function extractTimestamp(element) {
    const timeEl = element.querySelector(SELECTORS.time);
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        return utils.parseTimestamp(datetime);
      }

      // Try parsing the text
      const timeText = utils.safeText(timeEl);
      if (timeText) {
        const date = new Date(timeText);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
    }
    return Date.now();
  }

  /**
   * Extract a single match as a post
   */
  function extractMatchPost(matchElement) {
    const matchId = getMatchId(matchElement);

    if (utils.isAlreadyExtracted(matchId)) {
      return null;
    }

    const match = extractMatch(matchElement);
    if (!match.homeTeam || !match.awayTeam) return null; // Skip if no teams

    const status = parseMatchStatus(match.status);
    const hasScore = match.homeScore && match.awayScore;

    // Build content based on match status
    let content = `⚽ ${match.homeTeam} vs ${match.awayTeam}`;
    if (hasScore) {
      content = `⚽ ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`;
    }
    if (match.competition) {
      content += `\n🏆 ${match.competition}`;
    }
    if (match.status) {
      content += `\n📊 ${match.status}`;
    }
    if (match.venue) {
      content += `\n📍 ${match.venue}`;
    }

    const media = [];
    if (match.homeLogo) {
      media.push({
        type: 'image',
        url: match.homeLogo,
        alt: `${match.homeTeam} logo`,
      });
    }
    if (match.awayLogo) {
      media.push({
        type: 'image',
        url: match.awayLogo,
        alt: `${match.awayTeam} logo`,
      });
    }

    const timestamp = extractTimestamp(matchElement);

    const post = {
      id: matchId,
      author: match.competition || 'Soccer',
      handle: match.competition?.toLowerCase().replace(/\s+/g, '_') || 'soccer',
      content,
      contentHtml: `<p>⚽ <strong>${match.homeTeam} ${hasScore ? match.homeScore : ''} - ${hasScore ? match.awayScore : ''} ${match.awayTeam}</strong></p>${match.competition ? `<p>🏆 ${match.competition}</p>` : ''}${match.status ? `<p>📊 ${match.status}</p>` : ''}`,
      media: media.length > 0 ? media : undefined,
      metadata: {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status,
        competition: match.competition,
        venue: match.venue,
        matchTime: match.time,
        platform: 'fotmob',
        type: 'soccer_match',
      },
      timestamp,
      type: 'soccer_match',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all matches in the current view
   */
  function processMatches() {
    const matchElements = document.querySelectorAll(SELECTORS.match);
    const cardElements = document.querySelectorAll(SELECTORS.matchCard);

    const allElements = [...matchElements, ...cardElements];
    const matches = [];

    allElements.forEach(matchEl => {
      try {
        const match = extractMatchPost(matchEl);
        if (match) {
          matches.push(match);
        }
      } catch (err) {
        console.error('[Noteece FotMob] Error extracting match:', err);
      }
    });

    if (matches.length > 0) {
      console.log(`[Noteece FotMob] Extracted ${matches.length} matches`);
      utils.sendToBackend('posts_batch', matches);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece FotMob] Initializing extractor');

    // Process existing matches
    processMatches();

    // Watch for new matches
    utils.observeElements(`${SELECTORS.match}, ${SELECTORS.matchCard}`, (newMatches) => {
      console.log(`[Noteece FotMob] Detected ${newMatches.length} new matches`);
      const extracted = [];

      newMatches.forEach(matchEl => {
        try {
          const match = extractMatchPost(matchEl);
          if (match) {
            extracted.push(match);
          }
        } catch (err) {
          console.error('[Noteece FotMob] Error extracting new match:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan for live score updates
    setInterval(() => {
      processMatches();
    }, 30000); // Every 30 seconds for live matches
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
