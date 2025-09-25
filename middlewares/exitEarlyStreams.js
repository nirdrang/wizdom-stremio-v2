const logger = require('../common/logger');

module.exports = (res) => {
  logger.debug('Exiting early with empty streams array.');
  res.json({ streams: [] });
};
