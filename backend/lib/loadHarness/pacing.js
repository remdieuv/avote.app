/**
 * Étalement des votes — respecte le plafond IP sans le contourner.
 */

/**
 * Délai entre deux votes pour respecter maxVotesPerSec.
 * @param {number} maxVotesPerSec
 * @returns {number} ms
 */
function voteIntervalMs(maxVotesPerSec) {
  const rate = Math.max(1, Math.trunc(Number(maxVotesPerSec) || 1));
  return Math.ceil(1000 / rate);
}

/**
 * @param {number} index 0-based
 * @param {number} maxVotesPerSec
 * @returns {number} delay ms before starting vote index
 */
function voteStartDelayMs(index, maxVotesPerSec) {
  const i = Math.max(0, Math.trunc(Number(index) || 0));
  return i * voteIntervalMs(maxVotesPerSec);
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  const n = Math.max(0, Number(ms) || 0);
  return new Promise((resolve) => setTimeout(resolve, n));
}

module.exports = {
  voteIntervalMs,
  voteStartDelayMs,
  sleep,
};
