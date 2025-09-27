const exitEarlyWithEmptySubtitlesArray = require('./exitEarly');
const { fetchSubsFromWizdom } = require('../client/wizdom');
const sortSubs = require('../util/sortSubs');

const getExitHandler = (res) =>
  res.locals?.exitWithEmptyResponse || exitEarlyWithEmptySubtitlesArray;

async function getWizdomSubs(req, res, next) {
  if (!req.title || !req.title.imdbID) {
    const exitEarly = getExitHandler(res);
    exitEarly(res);
    return;
  }

  const { imdbID, season, episode, filename } = req.title;
  const subs = await fetchSubsFromWizdom(imdbID, season, episode);

  if (!subs) {
    const exitEarly = getExitHandler(res);
    exitEarly(res);
    return;
  }

  if (filename) {
    sortSubs(subs, filename);
  }

  req.subs = subs;
  next();
}

module.exports = getWizdomSubs;
