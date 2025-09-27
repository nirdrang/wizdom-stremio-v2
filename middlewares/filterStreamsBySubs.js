const {
  getBestSubtitleMatchScore,
  MATCH_THRESHOLD_RATIO,
  NO_MATCH_SCORE,
} = require('../util/matchSubs');
const logger = require('../common/logger');
const config = require('config');

const getCandidateNames = (stream) => {
  const candidates = new Set();

  if (stream?.behaviorHints?.filename) {
    candidates.add(stream.behaviorHints.filename);
  }

  if (stream?.name) {
    candidates.add(stream.name);
  }

  if (stream?.title) {
    candidates.add(stream.title);
  }

  return Array.from(candidates);
};

const getBestScoreForStream = (stream, subtitles) => {
  const candidates = getCandidateNames(stream);

  if (!candidates.length) {
    return NO_MATCH_SCORE;
  }

  return candidates.reduce((bestScore, candidate) => {
    const score = getBestSubtitleMatchScore(subtitles, candidate);

    return score < bestScore ? score : bestScore;
  }, NO_MATCH_SCORE);
};

// Pattern matching removed - rely only on OpenSubtitles API for accuracy

const enhanceStreamsBySubs = (req, res, next) => {
  const streams = Array.isArray(req.streams) ? req.streams : [];
  const subtitles = Array.isArray(req.subs) ? req.subs : [];
  const { imdbID, type } = req.title || {};

  logger.info(`🎬 ENHANCING REQUEST: ${type}/${imdbID} - Processing ${streams.length} streams with ${subtitles.length} Hebrew subtitles`);

  if (!streams.length) {
    req.filteredStreams = [];
    next();
    return;
  }

  // Score all streams for Hebrew subtitle compatibility
  let hebrewScoredStreams = [];
  let nonHebrewStreams = [];

  if (subtitles.length > 0) {
    logger.debug(`🇮🇱 HEBREW SCORING: Checking ${streams.length} streams against ${subtitles.length} Hebrew subtitles`);
    
    streams.forEach((stream) => {
      const score = getBestScoreForStream(stream, subtitles);
      const streamName = stream.title || stream.name || 'Unknown';
      const hasHebrew = Number.isFinite(score) && score <= MATCH_THRESHOLD_RATIO;
      
      logger.debug(`   📊 "${streamName}" → Score: ${score === NO_MATCH_SCORE ? 'NO_MATCH' : score.toFixed(3)} ${hasHebrew ? '✅ HEB' : ''}`);
      
      if (hasHebrew) {
        hebrewScoredStreams.push({
          stream,
          score,
          hasHebrew: true
        });
      } else {
        nonHebrewStreams.push({
          stream,
          score: Infinity, // Low priority for sorting
          hasHebrew: false
        });
      }
    });
    
    logger.info(`🇮🇱 HEBREW DETECTION: ${hebrewScoredStreams.length}/${streams.length} streams have Hebrew subtitles available`);
  } else {
    // No Hebrew subtitles available for this content
    logger.info(`ℹ️  NO HEBREW SUBS: No Hebrew subtitles found for ${type}/${imdbID}`);
    nonHebrewStreams = streams.map(stream => ({
      stream,
      score: Infinity,
      hasHebrew: false
    }));
  }

  // Combine and sort: Hebrew streams first (by best score), then non-Hebrew streams
  const allStreams = [...hebrewScoredStreams, ...nonHebrewStreams];
  
  req.filteredStreams = allStreams
    .sort((first, second) => {
      // Hebrew streams always come first
      if (first.hasHebrew !== second.hasHebrew) {
        return first.hasHebrew ? -1 : 1;
      }
      // Within same type, sort by score (lower = better for Hebrew, maintain original order for non-Hebrew)
      if (first.hasHebrew && second.hasHebrew) {
        return first.score - second.score;
      }
      return 0; // Keep original order for non-Hebrew streams
    })
    .map(({ stream, hasHebrew }) => {
      // Add [HEB] prefix only to streams with Hebrew subtitles
      if (hasHebrew) {
        const modifiedStream = { ...stream };
        modifiedStream.title = `🇮🇱 [HEB] ${stream.title || stream.name || 'Unknown'}`;
        return modifiedStream;
      }
      return stream; // Return original stream unchanged
    });

  const hebrewCount = hebrewScoredStreams.length;
  const totalCount = streams.length;
  
  logger.info(`🎯 ENHANCED RESULTS: ${totalCount} total streams (${hebrewCount} with Hebrew subtitles, ${totalCount - hebrewCount} without)`);
  
  if (hebrewCount > 0) {
    logger.info(`🏆 TOP HEBREW MATCHES:`);
    hebrewScoredStreams.slice(0, 5).forEach(({stream, score}, index) => {
      const streamName = stream.title || stream.name || 'Unknown';
      logger.info(`   ${index + 1}. 🇮🇱 "${streamName}" (score: ${score.toFixed(3)})`);
    });
  }

  next();
};

module.exports = enhanceStreamsBySubs;
