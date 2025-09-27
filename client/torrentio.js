const superagent = require('superagent');
const config = require('config');
const logger = require('../common/logger');

const { baseUrl: TORRENTIO_BASE_URL, timeout: TORRENTIO_TIMEOUT } =
  config.get('torrentio');

const buildIdSegment = (imdbId, season, episode) => {
  let segment = imdbId;

  if (season) {
    segment += `:${season}`;
  }

  if (episode) {
    segment += `:${episode}`;
  }

  return segment;
};

const buildStreamsUrl = (type, imdbId, season, episode, rawQuery) => {
  const idSegment = buildIdSegment(imdbId, season, episode);

  let url = `${TORRENTIO_BASE_URL}/stream/${type}/${idSegment}`;

  if (rawQuery) {
    url += `/${rawQuery}`;
  }

  return `${url}.json`;
};

const fetchStreamsFromTorrentio = async (
  type,
  imdbId,
  season,
  episode,
  rawQuery
) => {
  const url = buildStreamsUrl(type, imdbId, season, episode, rawQuery);

  try {
    const response = await superagent.get(url).timeout(TORRENTIO_TIMEOUT);
    const streams = response.body?.streams;

    return Array.isArray(streams) ? streams : [];
  } catch (error) {
    logger.error(error, {
      description: 'Failed to fetch streams from torrentio',
      type,
      imdbId,
      season,
      episode,
      rawQuery,
    });

    return [];
  }
};

module.exports = { fetchStreamsFromTorrentio };
