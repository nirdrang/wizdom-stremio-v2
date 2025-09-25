/**
 * The addon's manifest: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
 */

module.exports = {
  id: 'xyz.stremio.wizdom.hebrew-english-filter',
  contactEmail: 'maor@magori.online',
  version: process.env.npm_package_version,
  catalogs: [],
  resources: ['stream'],
  types: ['movie', 'series'],
  name: 'Hebrew Subtitle Stream Enhancer',
  description:
    'Shows ALL Torrentio streams with [HEB] prefix for Hebrew subtitle availability. Hebrew-enabled streams listed first by best match quality.',
  logo: 'https://i.ibb.co/KLYK0TH/wizdon256.png',
};
