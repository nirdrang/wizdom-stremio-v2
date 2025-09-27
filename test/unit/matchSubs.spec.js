const assert = require('assert');

const {
  hasMatchingSubtitle,
  normalizeName,
  getBestSubtitleMatchScore,
  MATCH_THRESHOLD_RATIO,
} = require('../../util/matchSubs');

describe('matchSubs utility', () => {
  it('normalizes titles by stripping punctuation and casing', () => {
    const original = 'The.Matrix-1999!';
    const normalized = normalizeName(original);

    assert.strictEqual(normalized, 'the matrix 1999');
  });

  it('returns true when a subtitle closely matches the target name', () => {
    const subtitles = [
      { versioname: 'Movie.Name.1080p.WEB-DL.HebSubs' },
      { versioname: 'Other release' },
    ];

    const result = hasMatchingSubtitle(subtitles, 'Movie Name 1080p WEB-DL');

    assert.strictEqual(result, true);
  });

  it('returns false when subtitles are too different', () => {
    const subtitles = [{ versioname: 'Completely Different Release' }];

    const result = hasMatchingSubtitle(subtitles, 'Movie.Name.1080p');

    assert.strictEqual(result, false);
  });

  it('returns false when provided an empty list', () => {
    const result = hasMatchingSubtitle([], 'Movie.Name.1080p');

    assert.strictEqual(result, false);
  });

  it('computes the best subtitle match score for a target', () => {
    const subtitles = [
      { versioname: 'Movie Name 1080p WEB-DL HebSubs' },
      { versioname: 'Other Release' },
    ];

    const score = getBestSubtitleMatchScore(
      subtitles,
      'Movie.Name.1080p.WEB-DL.HebSubs'
    );

    assert.ok(Number.isFinite(score));
    assert.ok(score <= MATCH_THRESHOLD_RATIO);
  });

  it('returns a score greater than the threshold when subtitles are too different', () => {
    const score = getBestSubtitleMatchScore(
      [{ versioname: 'Completely Different Release' }],
      'Movie.Name.1080p'
    );

    assert.ok(score > MATCH_THRESHOLD_RATIO);
  });
});
