const { hasEnglishSubtitles } = require('../client/opensubtitles');
const logger = require('../common/logger');
const config = require('config');

async function getEnglishSubs(req, res, next) {
  const fallbackEnabled = config.get('filtering.fallbackToEnglish');
  
  if (!fallbackEnabled) {
    req.hasEnglishSubs = false;
    next();
    return;
  }

  if (!req.title || !req.title.imdbID) {
    req.hasEnglishSubs = false;
    next();
    return;
  }

  const { imdbID, season, episode } = req.title;
  
  try {
    logger.info(`🔍 ENGLISH CHECK: Querying OpenSubtitles API for ${imdbID}${season ? ` S${season}E${episode}` : ''}`);
    req.hasEnglishSubs = await hasEnglishSubtitles(imdbID, season, episode);
    
    if (req.hasEnglishSubs) {
      logger.info(`✅ ENGLISH FOUND: OpenSubtitles has English subtitles for ${imdbID}`);
    } else {
      logger.warn(`❌ ENGLISH NOT FOUND: No English subtitles on OpenSubtitles for ${imdbID}`);
    }
  } catch (error) {
    logger.error(`🚨 ENGLISH API ERROR: Failed to check OpenSubtitles for ${imdbID}: ${error.message}`);
    req.hasEnglishSubs = false;
  }

  next();
}

module.exports = getEnglishSubs;
