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

  const resultCell = voteResult === 'null'
    ? 'Null'
    : `{{Icon|Voting-${voteResult}.svg}} [[/Archive#${anchor}|Summary]]`;

  const logLink = voteResult === 'null'
    ? subject
    : `[[/Log/${toOrdinal(day)}: ${subject}|${subject}]]`;

  return [
    `|${logLink}`,
    `|[[User:${proposer}|${proposer}]]`,
    `|${startDate}`,
    `|${endDate}`,
    `|${resultCell}`,
  ].join('\n');
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
  const heading = `==== ${toOrdinal(day)}: ${subject} ====`;

  let bullet;
  if (voteResult === 'null') {
    bullet = `*Not enough votes (${total}/7) - proposal nulled.`;
  } else {
    bullet = `*${summary} {{VoteSummary|${supportCount}|${opposeCount}|${restructureCount}}}`;
  }

  return `${heading}\n${bullet}`;
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
