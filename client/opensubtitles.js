/**
 * OpenSubtitles API client for English subtitle detection
 */

const superagent = require('superagent');
const logger = require('../common/logger');
const config = require('config');

const getOpenSubtitlesConfig = () => config.get('filtering.englishProvider');

/**
 * Search for English subtitles on OpenSubtitles by IMDB ID
 * @param {string} imdbId - IMDB ID (with tt prefix)
 * @param {string} season - Season number (for TV shows)
 * @param {string} episode - Episode number (for TV shows)
 * @returns {Promise<Array>} - Array of English subtitle results
 */
const fetchEnglishSubsFromOpenSubtitles = async (imdbId, season, episode) => {
  const osConfig = getOpenSubtitlesConfig();
  
  if (!osConfig.enabled) {
    logger.debug('OpenSubtitles API disabled, skipping English subtitle check');
    return [];
  }

  const searchParams = {
    imdb_id: imdbId.replace('tt', ''), // Remove tt prefix
    languages: 'en',
  };

  // Add season/episode for TV shows
  if (season && episode) {
    searchParams.season_number = season;
    searchParams.episode_number = episode;
  }

  const queryString = new URLSearchParams(searchParams).toString();
  const url = `${osConfig.baseUrl}/subtitles?${queryString}`;

  try {
    logger.debug(`Checking OpenSubtitles for English subs: ${imdbId}`);
    
    const response = await superagent
      .get(url)
      .set('User-Agent', osConfig.userAgent)
      .set('Api-Key', osConfig.apiKey || '') // API key is optional for basic searches
      .timeout(osConfig.timeout);

    const subtitles = response.body?.data || [];
    
    logger.debug(`Found ${subtitles.length} English subtitles on OpenSubtitles for ${imdbId}`);
    
    return subtitles.map(sub => ({
      id: sub.attributes?.subtitle_id,
      filename: sub.attributes?.release,
      download_count: sub.attributes?.download_count || 0,
      rating: sub.attributes?.rating || 0,
      language: 'en'
    }));

  } catch (error) {
    logger.debug(`OpenSubtitles API error for ${imdbId}: ${error.message}`);
    return []; // Return empty array on error, don't fail the whole request
  }
};

/**
 * Check if English subtitles are available for a given IMDB ID
 * @param {string} imdbId - IMDB ID 
 * @param {string} season - Season number
 * @param {string} episode - Episode number
 * @returns {Promise<boolean>} - True if English subs available
 */
const hasEnglishSubtitles = async (imdbId, season, episode) => {
  const subs = await fetchEnglishSubsFromOpenSubtitles(imdbId, season, episode);
  return subs.length > 0;
};

module.exports = {
  fetchEnglishSubsFromOpenSubtitles,
  hasEnglishSubtitles
};
