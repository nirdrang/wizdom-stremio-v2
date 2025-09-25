const request = require('supertest');
const assert = require('assert');
const nock = require('nock');

const addon = require('../../../server');

const TORRENTIO_BASE_URL = 'https://torrentio.strem.fun';
const WIZDOM_BASE_URL = 'https://wizdom.xyz';
const MOCK_IMDB_ID = 'tt7654321';

const mockTorrentio = (path, response, status = 200) => {
  nock(TORRENTIO_BASE_URL).get(path).reply(status, response);
};

const buildWizdomSearchPath = (imdbId) =>
  `/api/search?action=by_id&imdb=${imdbId}&season=undefined&episode=undefined`;

const mockWizdom = (imdbId, response) => {
  const searchPath = buildWizdomSearchPath(imdbId);

  nock(`${WIZDOM_BASE_URL}/`).get(searchPath).reply(200, response);
};

describe('GET /stream/:type/:imdbId/:query?.json', () => {
  before(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  after(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('returns only torrentio streams that have a matching wizdom subtitle', async () => {
    const matchingStream = {
      title: 'Torrent A',
      name: 'Movie.Name.1080p.WEB-DL.HebSubs',
      url: 'magnet:?xt=urn:btih:123',
    };
    const otherStream = {
      title: 'Torrent B',
      name: 'Different.Release.720p',
      url: 'magnet:?xt=urn:btih:456',
    };

    const baseStreamPath = `/stream/movie/${MOCK_IMDB_ID}.json`;

    mockTorrentio(baseStreamPath, {
      streams: [matchingStream, otherStream],
    });

    mockWizdom(MOCK_IMDB_ID, [
      { id: 1, versioname: 'Movie Name 1080p WEB-DL HebSubs' },
    ]);

    const response = await request(addon).get(baseStreamPath);

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body?.streams));
    assert.deepStrictEqual(response.body.streams, [matchingStream]);
  });

  it('returns an empty list when no subtitles match the torrents', async () => {
    const baseStreamPath = `/stream/movie/${MOCK_IMDB_ID}.json`;

    mockTorrentio(baseStreamPath, {
      streams: [
        {
          title: 'Torrent C',
          name: 'Completely.Different.Release',
          url: 'magnet:?xt=urn:btih:789',
        },
      ],
    });

    mockWizdom(MOCK_IMDB_ID, [{ id: 2, versioname: 'Another Subtitle' }]);

    const response = await request(addon).get(baseStreamPath);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body.streams, []);
  });

  it('forwards extra path segments to torrentio', async () => {
    const extra = 'filename=Movie.Name.1080p';

    mockTorrentio(`/stream/movie/${MOCK_IMDB_ID}/${extra}.json`, {
      streams: [
        {
          title: 'Torrent with filename',
          name: 'Movie.Name.1080p',
          behaviorHints: { filename: 'Movie.Name.1080p' },
          url: 'magnet:?xt=urn:btih:111',
        },
      ],
    });

    mockWizdom(MOCK_IMDB_ID, [{ id: 3, versioname: 'Movie Name 1080p' }]);

    const response = await request(addon).get(
      `/stream/movie/${MOCK_IMDB_ID}/${extra}.json`
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.streams.length, 1);
    assert.strictEqual(
      response.body.streams[0].behaviorHints.filename,
      'Movie.Name.1080p'
    );
  });

  it('orders matched streams by the best subtitle score', async () => {
    const betterStream = {
      title: 'Torrent Closest',
      name: 'Movie.Name.1080p.WEB-DL.HebSubs',
      url: 'magnet:?xt=urn:btih:999',
    };
    const weakerStream = {
      title: 'Torrent Still Valid',
      name: 'Movie.Name.1080p.DVDRip.NoHebSubs',
      url: 'magnet:?xt=urn:btih:888',
    };

    const baseStreamPath = `/stream/movie/${MOCK_IMDB_ID}.json`;

    mockTorrentio(baseStreamPath, {
      streams: [weakerStream, betterStream],
    });

    mockWizdom(MOCK_IMDB_ID, [
      { id: 4, versioname: 'Movie Name 1080p WEB-DL HebSubs' },
    ]);

    const response = await request(addon).get(baseStreamPath);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body.streams, [betterStream, weakerStream]);
  });
});
