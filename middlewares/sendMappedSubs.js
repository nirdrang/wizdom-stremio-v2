const config = require('config');

const SERVER_HOSTNAME = config.get('hostname');
const SRT_ROUTE = config.get('srtUnzipperRoute');
const PORT = config.get('port');
const IS_PRODUCTION = config.get('isProduction');

const getSubUrl = (subID) =>
  `${SERVER_HOSTNAME}${IS_PRODUCTION ? '' : `:${PORT}`}${SRT_ROUTE}${subID}.srt`;

/**
 * Builds an array of subtitle object: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/subtitles.md
 * Since version 2.2.3 I've added id to each sub.
 */
const mapToStremioSubs = (req, res) => {
  const subtitles = req?.subs?.map?.((sub) => ({
    url: getSubUrl(sub.id),
    lang: 'heb',
    id: `[WIZDOM]${sub.versioname}`,
  }));

  // Log final ordered subtitles list as it will appear in Stremio UI
  const logger = require('../common/logger');
  logger.info(`📝 STREMIO UI SUBTITLES ORDER (${subtitles?.length || 0} subtitles):`);
  if (subtitles && subtitles.length > 0) {
    subtitles.forEach((sub, index) => {
      logger.info(`   ${index + 1}. 🇮🇱 "${sub.id}" → ${sub.url}`);
    });
  } else {
    logger.info(`   No Hebrew subtitles available`);
  }

  res.json({ subtitles: subtitles || [] });
};

module.exports = mapToStremioSubs;
