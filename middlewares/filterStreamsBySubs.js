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


const formatMatchScore = (score) => {
  if (!Number.isFinite(score)) {
    return null;
  }

  return score.toFixed(3);
};

// Extract quality from stream title/name (2160p > 1080p > 720p > 480p)
const extractQuality = (stream) => {
  const title = stream.title || stream.name || '';
  
  // Quality priority (higher number = better quality)
  if (title.match(/2160p|4k/i)) return 2160;
  if (title.match(/1080p/i)) return 1080;
  if (title.match(/720p/i)) return 720;
  if (title.match(/480p/i)) return 480;
  if (title.match(/360p/i)) return 360;
  
  return 0; // Unknown quality
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
      
      // Extract seeders for logging
      const seeders = (() => {
        const title = stream.title || stream.name || '';
        const patterns = [
          /\[S:(\d+)/i,           // [S:42 L:5]
          /\[(\d+)\/\d+\]/,       // [42/5]
          /\((\d+)\/\d+\)/,       // (42/5)
          /👤(\d+)/,              // 👤42
          /S:(\d+)/i              // S:42
        ];
        
        for (const pattern of patterns) {
          const match = title.match(pattern);
          if (match) {
            return parseInt(match[1], 10);
          }
        }
        return 0;
      })();
      
      logger.debug(`   📊 "${streamName}" → Score: ${score === NO_MATCH_SCORE ? 'NO_MATCH' : score.toFixed(3)} | Seeders: ${seeders} ${hasHebrew ? '✅ HEB' : ''}`);
      
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

  // Function to extract seeders from stream title
  const extractSeeders = (stream) => {
    const title = stream.title || stream.name || '';
    
    // Try to extract seeders from common patterns like [S:42 L:5], [42/5], (42/5), etc.
    const patterns = [
      /\[S:(\d+)/i,           // [S:42 L:5]
      /\[(\d+)\/\d+\]/,       // [42/5]
      /\((\d+)\/\d+\)/,       // (42/5)
      /👤(\d+)/,              // 👤42
      /S:(\d+)/i              // S:42
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return 0; // Default to 0 if no seeders found
  };

  // Combine and sort: Hebrew streams first (by best score), then non-Hebrew streams
  const allStreams = [...hebrewScoredStreams, ...nonHebrewStreams];
  
  req.filteredStreams = allStreams
    .sort((first, second) => {
      // Hebrew streams always come first
      if (first.hasHebrew !== second.hasHebrew) {
        return first.hasHebrew ? -1 : 1;
      }
      
      // Within same type, sort by quality first, then subtitle score
      if (first.hasHebrew && second.hasHebrew) {
        // Primary sort: by quality (higher is better)
        const firstQuality = extractQuality(first.stream);
        const secondQuality = extractQuality(second.stream);
        const qualityDiff = secondQuality - firstQuality;
        if (qualityDiff !== 0) {
          return qualityDiff;
        }
        
        // Secondary sort: by subtitle score (lower is better)
        const scoreDiff = first.score - second.score;
        return scoreDiff;
      }
      
      // For non-Hebrew streams, sort by quality only
      if (!first.hasHebrew && !second.hasHebrew) {
        const firstQuality = extractQuality(first.stream);
        const secondQuality = extractQuality(second.stream);
        return secondQuality - firstQuality;
      }
      
      return 0; // Fallback
    })
    .map(({ stream, hasHebrew, score }) => {
      // Add [HEB] prefix only to streams with Hebrew subtitles
      if (hasHebrew) {
        const modifiedStream = { ...stream };
        const formattedScore = formatMatchScore(score);
        const scoreLabel = formattedScore ? ` | score:${formattedScore}` : '';
        const baseTitle = stream.title || stream.name || 'Unknown';
        modifiedStream.title = `🇮🇱 [HEB${scoreLabel}] ${baseTitle}`;
        // Preserve scoring information for logging
        modifiedStream._hebrewScore = score;
        modifiedStream._hasHebrew = true;
        return modifiedStream;
      }
      // Preserve scoring information for non-Hebrew streams too
      const modifiedStream = { ...stream };
      modifiedStream._hebrewScore = Infinity;
      modifiedStream._hasHebrew = false;
      return modifiedStream;
    });

  const hebrewCount = hebrewScoredStreams.length;
  const totalCount = streams.length;
  
  logger.info(`🎯 ENHANCED RESULTS: ${totalCount} total streams (${hebrewCount} with Hebrew subtitles, ${totalCount - hebrewCount} without)`);
  
  // Log final ordered list as it will appear in Stremio UI with scoring details
  logger.info(`📺 STREMIO UI ORDER (${req.filteredStreams.length} streams):`);
  req.filteredStreams.forEach((stream, index) => {
    const streamTitle = stream.title || stream.name || 'Unknown';
    const seeders = extractSeeders(stream);
    const hasHebFlag = streamTitle.includes('🇮🇱 [HEB]') ? '🇮🇱' : '🌐';
    
    // Use preserved scoring information
    const scoreInfo = stream._hasHebrew ? 
      `(score: ${stream._hebrewScore.toFixed(3)})` : 
      '(no Hebrew match)';
    
    logger.info(`   ${index + 1}. ${hasHebFlag} "${streamTitle}" ${scoreInfo} ${seeders > 0 ? `(👤${seeders})` : ''}`);
    
    // Log the URL for each stream
    if (stream.url) {
      logger.info(`      🔗 ${stream.url}`);
    }
  });

  next();
};

module.exports = enhanceStreamsBySubs;
