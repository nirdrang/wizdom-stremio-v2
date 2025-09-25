const { fetchStreamsFromTorrentio } = require('../client/torrentio');

async function getTorrentioStreams(req, res, next) {
  if (!req.title || !req.title.type || !req.title.imdbID) {
    req.streams = [];
    next();
    return;
  }

  const { type, imdbID, season, episode, rawQuery } = req.title;
  const streams = await fetchStreamsFromTorrentio(
    type,
    imdbID,
    season,
    episode,
    rawQuery
  );

  req.streams = streams;
  next();
}

module.exports = getTorrentioStreams;
