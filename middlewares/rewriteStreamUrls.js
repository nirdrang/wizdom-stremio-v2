const config = require('config');
const logger = require('../common/logger');

const torrserverConfig = config.get('torrserver');

// Log TorrServer configuration on startup
if (torrserverConfig.enabled) {
  logger.info(`🔧 TorrServer URL rewriting enabled: ${torrserverConfig.baseUrl} (preload: ${torrserverConfig.preload})`);
}

/**
 * Extracts the infoHash from a magnet link
 * @param {string} magnetUrl - The magnet URL
 * @returns {string|null} - The extracted infoHash or null if not found
 */
function extractInfoHash(magnetUrl) {
  if (!magnetUrl || typeof magnetUrl !== 'string') {
    return null;
  }

  // Match magnet links with xt=urn:btih: pattern
  const match = magnetUrl.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
  
  if (match && match[1]) {
    return match[1].toLowerCase();
  }

  return null;
}

/**
 * Extracts filename from stream name or behaviorHints
 * @param {object} stream - The stream object
 * @returns {string} - The filename to use in the URL
 */
function extractFilename(stream) {
  // Try to get filename from behaviorHints first
  if (stream.behaviorHints && stream.behaviorHints.filename) {
    return stream.behaviorHints.filename;
  }
  
  // Fall back to stream name
  if (stream.name) {
    return stream.name;
  }
  
  // Last resort: use a generic filename
  return 'video.mkv';
}

/**
 * Builds a TorrServer stream URL from stream data
 * @param {string} infoHash - The torrent infoHash
 * @param {string} filename - The filename to include in the path
 * @param {string} baseUrl - The TorrServer base URL
 * @param {boolean} preload - Whether to enable preloading
 * @param {number} fileIdx - The file index in the torrent (from Torrentio)
 * @returns {string} - The TorrServer stream URL
 */
function buildTorrServerUrl(infoHash, filename, baseUrl, preload = false, fileIdx = null) {
  // URL encode the filename for the path
  const encodedFilename = encodeURIComponent(filename);
  
  // Build query parameters
  const params = [
    `link=${infoHash}`
  ];
  
  // Use fileIdx from Torrentio if available, otherwise default to 1
  const index = fileIdx !== null ? fileIdx : 1;
  params.push(`index=${index}`);
  
  // Add preload flag if enabled
  if (preload) {
    params.push('preload');
  }
  
  // Add play flag to keep the stream alive
  params.push('play');
  
  // TorrServer stream endpoint: /stream/<filename>?link=<infoHash>&index=<idx>&play[&preload]
  return `${baseUrl}/stream/${encodedFilename}?${params.join('&')}`;
}

/**
 * Middleware to rewrite Torrentio stream URLs to point to local TorrServer
 */
async function rewriteStreamUrls(req, res, next) {
  // Check if TorrServer rewriting is enabled
  if (!torrserverConfig.enabled) {
    logger.info('⚠️  TorrServer URL rewriting is DISABLED (torrserver.enabled = false)');
    next();
    return;
  }

  // Check if we have streams to process
  if (!Array.isArray(req.streams) || req.streams.length === 0) {
    next();
    return;
  }

  const baseUrl = torrserverConfig.baseUrl;

  if (!baseUrl) {
    logger.warn('TorrServer is enabled but baseUrl is not configured');
    next();
    return;
  }

  const preload = torrserverConfig.preload || false;

  // Rewrite each stream's URL
  req.streams = req.streams.map((stream, index) => {
    // Check if stream has infoHash directly or needs URL extraction
    let infoHash = null;
    
    if (stream.infoHash) {
      // Torrentio sends infoHash directly
      infoHash = stream.infoHash.toLowerCase();
    } else if (stream.url) {
      // Fallback: Extract from magnet URL if present
      infoHash = extractInfoHash(stream.url);
    } else {
      // No infoHash or URL available
      logger.debug(`Stream ${index + 1}: Skipped - no infoHash or URL`);
      return stream;
    }

    if (!infoHash) {
      logger.debug(`Stream ${index + 1}: Failed to get infoHash`);
      return stream;
    }

    const filename = extractFilename(stream);
    const fileIdx = stream.fileIdx || null; // Get fileIdx from Torrentio if available
    const torrServerUrl = buildTorrServerUrl(infoHash, filename, baseUrl, preload, fileIdx);
    
    logger.debug({
      infoHash,
      filename,
      fileIdx,
      torrServerUrl,
      streamTitle: stream.title,
    }, `Rewrote stream ${index + 1} to TorrServer`);

    // Remove infoHash to prevent Stremio from trying to download the torrent itself
    const { infoHash: _removed, ...streamWithoutInfoHash } = stream;
    
    return {
      ...streamWithoutInfoHash,
      url: torrServerUrl,
      externalUrl: torrServerUrl, // Stremio uses this for HTTP streams
      behaviorHints: {
        ...stream.behaviorHints,
        notWebReady: false, // Tell Stremio this stream is ready for web/HTTP playback
      }
    };
  });

  logger.info(`✅ Rewritten ${req.streams.length} stream(s) to TorrServer URLs`);
  
  next();
}

module.exports = rewriteStreamUrls;
