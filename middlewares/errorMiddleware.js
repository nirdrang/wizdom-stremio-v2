const logger = require('../common/logger');

function errorHandler(err, req, res, next) {
  logger.error(`Global error: ${err.message}`, {
    description: 'Global error occurred',
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Set CORS headers for error responses too
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
