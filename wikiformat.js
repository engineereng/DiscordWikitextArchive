/**
 * Convert a day-of-month number to its ordinal string (1st, 2nd, 3rd, 4th, ..., 31st).
 * @param {number} day
 * @returns {string}
 */
export function toOrdinal(day) {
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
  const teens = day >= 11 && day <= 13;
  const suffix = teens ? 'th' : (suffixes[day % 10] || 'th');
  return `${day}${suffix}`;
}

/**
 * Build the log page title from the proposal's start date and subject.
 * @param {number} day Day of month the proposal started
 * @param {string} subject Proposal subject (e.g. "Meatball Parade")
 * @returns {string} Full page title like "SiIvaGunner Wiki:Meme discussion/Log/22nd: Meatball Parade"
 */
export function logPageTitle(day, subject) {
  return `SiIvaGunner Wiki:Meme discussion/Log/${toOrdinal(day)}: ${subject}`;
}

/**
 * Build the archive anchor from the proposal's start date and subject.
 * @param {number} day
 * @param {string} subject
 * @returns {string} Anchor like "22nd: Meatball Parade"
 */
export function archiveAnchor(day, subject) {
  return `${toOrdinal(day)}: ${subject}`;
}

/**
 * Format a percentage to one decimal place.
 * @param {number} count
 * @param {number} total
 * @returns {string}
 */
function pct(count, total) {
  if (total === 0) return '0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

/**
 * Generate a proposals-page row for the Ended table.
 * @param {object} opts
 * @param {string} opts.subject
 * @param {number} opts.day
 * @param {string} opts.proposer Wiki username
 * @param {string} opts.startDate e.g. "April 14, 2025"
 * @param {string} opts.endDate
 * @param {string} opts.voteResult "support"|"oppose"|"restructure"|"null"
 * @returns {string} Wikitext table row
 */
export function proposalsPageRow({ subject, day, proposer, startDate, endDate, voteResult }) {
  const anchor = archiveAnchor(day, subject);
  const logTitle = logPageTitle(day, subject);

  if (voteResult === 'null') {
    return `| ${subject} || [[User:${proposer}|${proposer}]] || ${startDate} || ${endDate} || Null`;
  }

  const emojiFile = voteResult === 'support' ? 'Voting-support.svg'
    : voteResult === 'oppose' ? 'Voting-oppose.svg'
    : 'Voting-restructure.svg';

  return `| [[${logTitle}|${subject}]] || [[User:${proposer}|${proposer}]] || ${startDate} || ${endDate} || [[File:${emojiFile}|20px]] [[SiIvaGunner Wiki:Meme discussion/Archive#${anchor}|Summary]]`;
}

/**
 * Generate an archive page entry (heading + bullet summary).
 * @param {object} opts
 * @param {string} opts.subject
 * @param {number} opts.day
 * @param {string} opts.summary Human-written summary text
 * @param {string} opts.voteResult
 * @param {number} opts.supportCount
 * @param {number} opts.opposeCount
 * @param {number} opts.restructureCount
 * @returns {string} Wikitext for the archive entry
 */
export function archiveEntry({ subject, day, summary, voteResult, supportCount, opposeCount, restructureCount }) {
  const total = supportCount + opposeCount + restructureCount;
  const heading = `#### ${toOrdinal(day)}: **${subject}**`;

  let tallySummary;
  if (voteResult === 'null') {
    const parts = [];
    if (supportCount > 0) parts.push(`support: ${supportCount} (${pct(supportCount, total)})`);
    if (restructureCount > 0) parts.push(`restructure ${restructureCount} (${pct(restructureCount, total)})`);
    if (opposeCount > 0) parts.push(`oppose ${opposeCount} (${pct(opposeCount, total)})`);
    tallySummary = `* Not enough votes were cast for a decision to be made. (${total} total: ${parts.join(', ')})`;
  } else {
    const parts = [];
    if (supportCount > 0) parts.push(`support: ${supportCount} (${pct(supportCount, total)})`);
    if (restructureCount > 0) parts.push(`restructure ${restructureCount} (${pct(restructureCount, total)})`);
    if (opposeCount > 0) parts.push(`oppose ${opposeCount} (${pct(opposeCount, total)})`);
    tallySummary = `* ${summary} (${total} total: ${parts.join(', ')})`;
  }

  return `${heading}\n\n${tallySummary}`;
}

/**
 * Generate a scaffold to-do list row.
 * @param {object} opts
 * @param {string} opts.subject
 * @param {number} opts.day
 * @param {string} opts.summary
 * @returns {string}
 */
export function todoRow({ subject, day, summary }) {
  const anchor = archiveAnchor(day, subject);
  return `| [[SiIvaGunner Wiki:Meme discussion/Archive#${anchor}|${summary}]] || ''To be filled in by a wiki editor'' || 0%`;
}

/**
 * Generate a scaffold progress page row.
 * @param {object} opts
 * @param {string} opts.subject
 * @param {number} opts.day
 * @param {string} opts.summary
 * @param {string} opts.currentDate e.g. "March 1, 2026"
 * @returns {string}
 */
export function progressRow({ subject, day, summary, currentDate }) {
  const anchor = archiveAnchor(day, subject);
  return `| [[SiIvaGunner Wiki:Meme discussion/Archive#${anchor}|${toOrdinal(day)}]] || ${summary} || '''Not done''' || ${currentDate} ||`;
}
