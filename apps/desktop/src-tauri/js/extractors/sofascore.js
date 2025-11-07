/**
 * SofaScore Extractor
 *
 * Extracts match scores and results from multiple sports
 * (soccer, basketball, tennis, cricket, etc.)
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece SofaScore] Extractor loaded for account:', config.accountId);

  // SofaScore-specific selectors
  const SELECTORS = {
    // Match containers
    match: 'div[class*="event"], li[class*="event-"], div[data-testid*="event"]',
    matchCard: 'div[class*="MatchCard"], div[class*="eventRow"]',

    // Match details
    homeTeam: 'div[class*="participant-home"], span[class*="homeTeam"], div[class*="home"][class*="name"]',
    awayTeam: 'div[class*="participant-away"], span[class*="awayTeam"], div[class*="away"][class*="name"]',
    score: 'div[class*="score"], span[class*="Score"]',
    homeScore: 'span[class*="homeScore"], div[class*="home"][class*="score"]',
    awayScore: 'span[class*="awayScore"], div[class*="away"][class*="score"]',
    status: 'span[class*="status"], div[class*="time"], span[class*="state"]',
    time: 'time, span[class*="time"], div[class*="startTime"]',
    sport: 'span[class*="sport"], div[class*="category-name"]',
    tournament: 'div[class*="tournament"], span[class*="league"], div[class*="category"]',
    venue: 'span[class*="venue"], div[class*="stadium"]',

    // Team logos
    homeLogo: 'img[class*="home"][class*="logo"], img[class*="homeTeam"], div[class*="home"] img',
    awayLogo: 'img[class*="away"][class*="logo"], img[class*="awayTeam"], div[class*="away"] img',
  };

  /**
   * Sport icons mapping
   */
  const SPORT_ICONS = {
    'soccer': '⚽',
    'football': '⚽',
    'basketball': '🏀',
    'tennis': '🎾',
    'cricket': '🏏',
    'volleyball': '🏐',
    'hockey': '🏒',
    'rugby': '🏉',
    'baseball': '⚾',
    'handball': '🤾',
    'ice hockey': '🏒',
    'american football': '🏈',
    'table tennis': '🏓',
    'badminton': '🏸',
    'mma': '🥊',
    'boxing': '🥊',
    'motorsport': '🏎️',
    'esports': '🎮',
  };

  /**
   * Get sport icon
   */
  function getSportIcon(sportName) {
    const lower = sportName?.toLowerCase() || '';
    for (const [key, icon] of Object.entries(SPORT_ICONS)) {
      if (lower.includes(key)) return icon;
    }
    return '🏆'; // Default sports icon
  }

  /**
   * Extract match ID from element or generate one
   */
  function getMatchId(element) {
    // Try to get from data attributes
    const dataId = element.getAttribute('data-id') ||
                  element.getAttribute('data-event-id') ||
                  element.getAttribute('data-match-id') ||
                  element.getAttribute('id');

    if (dataId) return `ss_${dataId}`;

    // Try to get from link
    const link = element.querySelector('a[href*="/event/"], a[href*="/match/"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href?.match(/(?:event|match)\/([^/?]+)/);
      if (match) return `ss_${match[1]}`;
    }

    // Fallback: generate from teams and sport
    const homeTeam = element.querySelector(SELECTORS.homeTeam);
    const awayTeam = element.querySelector(SELECTORS.awayTeam);
    const sport = element.querySelector(SELECTORS.sport);
    if (homeTeam && awayTeam) {
      const home = utils.safeText(homeTeam).substring(0, 20);
      const away = utils.safeText(awayTeam).substring(0, 20);
      const sportName = utils.safeText(sport) || 'sport';
      return `ss_${sportName.replace(/\s/g, '_')}_${home.replace(/\s/g, '_')}_vs_${away.replace(/\s/g, '_')}_${Date.now()}`;
    }

    return `ss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const sportEl = element.querySelector(SELECTORS.sport);
    const tournamentEl = element.querySelector(SELECTORS.tournament);
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
      sport: utils.safeText(sportEl),
      tournament: utils.safeText(tournamentEl),
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
    if (lower.includes('live') || lower.includes('\'') || lower.includes('inprogress')) return 'live';
    if (lower.includes('finished') || lower.includes('ended') || lower.includes('final')) return 'finished';
    if (lower.includes('break') || lower.includes('halftime') || lower.includes('half time')) return 'halftime';
    if (lower.includes('scheduled') || lower.includes('upcoming') || lower.includes('not started')) return 'scheduled';
    if (lower.includes('postponed')) return 'postponed';
    if (lower.includes('cancelled') || lower.includes('canceled')) return 'cancelled';
    if (lower.includes('abandoned')) return 'abandoned';
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
    const sportIcon = getSportIcon(match.sport);

    // Build content based on match status
    let content = `${sportIcon} ${match.homeTeam} vs ${match.awayTeam}`;
    if (hasScore) {
      content = `${sportIcon} ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`;
    }
    if (match.sport) {
      content += `\n🏅 ${match.sport}`;
    }
    if (match.tournament) {
      content += `\n🏆 ${match.tournament}`;
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
      author: match.tournament || match.sport || 'Sports',
      handle: (match.tournament || match.sport || 'sports').toLowerCase().replace(/\s+/g, '_'),
      content,
      contentHtml: `<p>${sportIcon} <strong>${match.homeTeam} ${hasScore ? match.homeScore : ''} - ${hasScore ? match.awayScore : ''} ${match.awayTeam}</strong></p>${match.sport ? `<p>🏅 ${match.sport}</p>` : ''}${match.tournament ? `<p>🏆 ${match.tournament}</p>` : ''}${match.status ? `<p>📊 ${match.status}</p>` : ''}`,
      media: media.length > 0 ? media : undefined,
      metadata: {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status,
        sport: match.sport,
        tournament: match.tournament,
        venue: match.venue,
        matchTime: match.time,
        platform: 'sofascore',
        type: 'sports_match',
      },
      timestamp,
      type: 'sports_match',
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
        console.error('[Noteece SofaScore] Error extracting match:', err);
      }
    });

    if (matches.length > 0) {
      console.log(`[Noteece SofaScore] Extracted ${matches.length} matches`);
      utils.sendToBackend('posts_batch', matches);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece SofaScore] Initializing extractor');

    // Process existing matches
    processMatches();

    // Watch for new matches
    utils.observeElements(`${SELECTORS.match}, ${SELECTORS.matchCard}`, (newMatches) => {
      console.log(`[Noteece SofaScore] Detected ${newMatches.length} new matches`);
      const extracted = [];

      newMatches.forEach(matchEl => {
        try {
          const match = extractMatchPost(matchEl);
          if (match) {
            extracted.push(match);
          }
        } catch (err) {
          console.error('[Noteece SofaScore] Error extracting new match:', err);
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
