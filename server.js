const express = require('express');
const cors = require('cors');
const landing = require('./middlewares/landingTemplate');
const extractTitle = require('./middlewares/extractTitle');
const manifest = require('./data/manifest');
const mapToStremioSubs = require('./middlewares/sendMappedSubs');
const getWizdomSubs = require('./middlewares/getWizdomSubs');
const errorHandler = require('./middlewares/errorMiddleware');
const sendSrt = require('./middlewares/sendSrt');
const getTorrentioStreams = require('./middlewares/getTorrentioStreams');
const getEnglishSubs = require('./middlewares/getEnglishSubs');
const enhanceStreamsBySubs = require('./middlewares/filterStreamsBySubs');
const sendFilteredStreams = require('./middlewares/sendFilteredStreams');
const exitEarlyWithEmptyStreams = require('./middlewares/exitEarlyStreams');
const rewriteStreamUrls = require('./middlewares/rewriteStreamUrls');

const addon = express();

// Enhanced CORS configuration for Stremio
addon.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

// Add request logging middleware
addon.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`   User-Agent: ${req.get('User-Agent') || 'Not provided'}`);
  console.log(`   Origin: ${req.get('Origin') || 'Not provided'}`);
  console.log(`   Referer: ${req.get('Referer') || 'Not provided'}`);
  next();
});

//Landing page request.
addon.get('/', landing);

//manifest request with OPTIONS support
addon.options('/manifest.json', (req, res) => {
  res.sendStatus(200);
});

addon.get('/manifest.json', function (req, res) {
  res.json(manifest);
});

//Addon's readme request
addon.get('/README.md', (req, res) => {
  res.sendFile(`${__dirname}/README.md`);
});

const setStreamExitHandler = (req, res, next) => {
  res.locals.exitWithEmptyResponse = exitEarlyWithEmptyStreams;
  next();
};

addon.get('/stream/:type/:imdbId/:query?.json', [
  setStreamExitHandler,
  extractTitle,
  getTorrentioStreams,
  rewriteStreamUrls,
  getWizdomSubs,
  enhanceStreamsBySubs,
  sendFilteredStreams,
]);

//Subtitles request.
addon.get('/subtitles/:type/:imdbId/:query?.json', [
  extractTitle,
  getWizdomSubs,
  mapToStremioSubs,
]);

/**
 * unzips Wizdom zip files and send the srt file in it.
 */
addon.get('/srt/:id.srt', sendSrt);

addon.use(errorHandler);

module.exports = addon;
