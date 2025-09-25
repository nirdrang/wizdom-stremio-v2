const { distance } = require('fastest-levenshtein');

const NON_ALPHANUMERIC = /[^a-z0-9]+/gi;
const MATCH_THRESHOLD_RATIO = 0.4;

const normalizeName = (value) => {
  if (!value) {
    return '';
  }

  return value
    .toString()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const NO_MATCH_SCORE = Number.POSITIVE_INFINITY;

const getBestSubtitleMatchScore = (subtitles, targetName) => {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return NO_MATCH_SCORE;
  }

  const normalizedTarget = normalizeName(targetName);

  if (!normalizedTarget) {
    return NO_MATCH_SCORE;
  }

  return subtitles.reduce((bestScore, subtitle) => {
    const normalizedSubtitle = normalizeName(subtitle?.versioname);

    if (!normalizedSubtitle) {
      return bestScore;
    }

    const maxLength = Math.max(
      normalizedTarget.length,
      normalizedSubtitle.length
    );

    if (maxLength === 0) {
      return bestScore;
    }

    const distanceValue = distance(normalizedTarget, normalizedSubtitle);
    const score = distanceValue / maxLength;

    return score < bestScore ? score : bestScore;
  }, NO_MATCH_SCORE);
};

const hasMatchingSubtitle = (subtitles, targetName) => {
  const score = getBestSubtitleMatchScore(subtitles, targetName);

  if (!Number.isFinite(score)) {
    return false;
  }

  return score <= MATCH_THRESHOLD_RATIO;
};

module.exports = {
  hasMatchingSubtitle,
  normalizeName,
  getBestSubtitleMatchScore,
  NO_MATCH_SCORE,
  MATCH_THRESHOLD_RATIO,
};
