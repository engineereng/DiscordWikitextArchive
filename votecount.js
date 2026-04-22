/**
 * Vote counting module for meme proposals.
 *
 * Works on Discord message objects (from the Discord API) and detects:
 * - Custom emoji votes: <:Voting_support:ID>, <:Voting_oppose:ID>, etc.
 * - Strikethrough crossouts: ~~...vote...~~
 * - Multiple votes per user (latest non-crossed-out wins)
 */

const VOTE_EMOJI_PATTERN = /<:(?:Voting[_ ]?)?(support|oppose|restructure|neutral):(\d+)>/gi;
const STRIKETHROUGH_PATTERN = /~~([\s\S]*?)~~/g;

/**
 * Detect if a vote emoji in a message is crossed out via strikethrough.
 * A vote is considered crossed out if the emoji appears inside ~~...~~.
 * @param {string} content Message content
 * @returns {{ voteType: string|null, crossedOut: boolean }}
 */
function detectVoteInContent(content) {
  if (!content) return { voteType: null, crossedOut: false };

  // First, find all vote emoji in the full content
  const allVotes = [];
  let match;
  const fullPattern = new RegExp(VOTE_EMOJI_PATTERN.source, 'gi');
  while ((match = fullPattern.exec(content)) !== null) {
    allVotes.push({ type: match[1].toLowerCase(), index: match.index });
  }

  if (allVotes.length === 0) return { voteType: null, crossedOut: false };

  // Find all strikethrough regions
  const strikethroughRegions = [];
  const stPattern = new RegExp(STRIKETHROUGH_PATTERN.source, 'g');
  let stMatch;
  while ((stMatch = stPattern.exec(content)) !== null) {
    strikethroughRegions.push({ start: stMatch.index, end: stMatch.index + stMatch[0].length });
  }

  // For each vote, check if it's inside a strikethrough region
  const votes = allVotes.map(vote => {
    const inStrikethrough = strikethroughRegions.some(
      region => vote.index >= region.start && vote.index < region.end
    );
    return { ...vote, crossedOut: inStrikethrough };
  });

  // Return the last non-crossed-out vote if any; otherwise the last crossed-out one
  const nonCrossed = votes.filter(v => !v.crossedOut);
  if (nonCrossed.length > 0) {
    const last = nonCrossed[nonCrossed.length - 1];
    return { voteType: last.type, crossedOut: false };
  }

  const last = votes[votes.length - 1];
  return { voteType: last.type, crossedOut: true };
}

/**
 * Count votes from an array of Discord messages.
 * @param {Array<Object>} messages Discord message objects (chronological order, oldest first).
 *   Each must have: { author: { id, username, bot? }, content }
 * @returns {Object} { tally, voters, ambiguous, suggestedResult }
 */
export function countVotes(messages) {
  // Map of userId -> { username, votes: [{ type, crossedOut, messageContent, timestamp }] }
  const userVotes = new Map();

  for (const msg of messages) {
    if (msg.author.bot) continue;

    const { voteType, crossedOut } = detectVoteInContent(msg.content);
    if (!voteType) continue;

    if (!userVotes.has(msg.author.id)) {
      userVotes.set(msg.author.id, { username: msg.author.username, votes: [] });
    }

    userVotes.get(msg.author.id).votes.push({
      type: voteType,
      crossedOut,
      messageContent: msg.content,
      timestamp: msg.timestamp,
    });
  }

  // Resolve each user's final vote
  const finalVotes = new Map(); // userId -> { type, username, messageContent }
  const ambiguous = []; // users with crossed-out votes but no clear replacement

  for (const [userId, { username, votes }] of userVotes) {
    const nonCrossed = votes.filter(v => !v.crossedOut);

    if (nonCrossed.length > 0) {
      // Use the latest non-crossed-out vote
      const latest = nonCrossed[nonCrossed.length - 1];
      finalVotes.set(userId, {
        type: latest.type,
        username,
        messageContent: latest.messageContent,
      });
    } else {
      // All votes are crossed out -- flag as ambiguous
      ambiguous.push({
        userId,
        username,
        lastVote: votes[votes.length - 1],
      });
    }
  }

  // Tally
  const tally = { support: 0, oppose: 0, restructure: 0, neutral: 0 };
  const voters = { support: [], oppose: [], restructure: [], neutral: [] };

  for (const [userId, { type, username, messageContent }] of finalVotes) {
    const normalizedType = type === 'neutral' ? 'neutral' : type;
    tally[normalizedType] = (tally[normalizedType] || 0) + 1;
    if (!voters[normalizedType]) voters[normalizedType] = [];
    voters[normalizedType].push({ userId, username, messageContent });
  }

  const total = tally.support + tally.oppose + tally.restructure;

  // Suggest result based on thresholds
  let suggestedResult;
  if (total < 7) {
    suggestedResult = 'null';
  } else if (tally.support / total >= 0.75) {
    suggestedResult = 'support';
  } else if (tally.restructure / total >= 0.75) {
    suggestedResult = 'restructure';
  } else {
    suggestedResult = 'oppose';
  }

  return {
    tally,
    total,
    voters,
    ambiguous,
    suggestedResult,
  };
}

/**
 * Evaluate the voting threshold rules.
 * @param {number} support
 * @param {number} oppose
 * @param {number} restructure
 * @returns {{ result: string, reason: string }}
 */
export function evaluateThreshold(support, oppose, restructure) {
  const total = support + oppose + restructure;

  if (total < 7) {
    return { result: 'null', reason: `Not enough votes (${total}/7 minimum)` };
  }

  const supportPct = support / total;
  const restructurePct = restructure / total;

  if (supportPct >= 0.75) {
    return { result: 'support', reason: `Support has ${(supportPct * 100).toFixed(1)}% (>= 75%)` };
  }
  if (restructurePct >= 0.75) {
    return { result: 'restructure', reason: `Restructure has ${(restructurePct * 100).toFixed(1)}% (>= 75%)` };
  }
  return {
    result: 'oppose',
    reason: `No option reached 75%. Support: ${(supportPct * 100).toFixed(1)}%, Restructure: ${(restructurePct * 100).toFixed(1)}%`,
  };
}

// Patterns that indicate a message is a tally/closing summary, not an actual vote
const TALLY_INDICATORS = [
  /Final Tally/i,
  /\[PROPOSAL END\]/i,
  /\[CLOSED\]/i,
  /FINAL TALLY/,
  /^\s*SUPPORTS?\s/i,
  /Proposal (?:Rejected|Accepted|Passed)/i,
  /Decision:/i,
];

/**
 * Parse wikitext log (DiscordLog2 templates) into pseudo-message objects for testing.
 * Skips `class=ping reply`, `class=date-separator` entries, and tally/closing messages.
 * @param {string} wikitext Raw wikitext of a log page
 * @returns {Array<Object>} Array of { author: { id, username, bot: false }, content }
 */
export function parseWikitextLog(wikitext) {
  const messages = [];
  // DiscordLog2 templates can span multiple lines, so use a greedy match up to }}
  const templateRegex = /\{\{DiscordLog2\|([\s\S]*?)\}\}/g;
  let match;

  while ((match = templateRegex.exec(wikitext)) !== null) {
    const params = match[1];

    // Skip replies and date separators
    if (params.includes('class=ping reply') || params.includes('class=date-separator') || params.includes('class=system-message')) {
      continue;
    }

    // Extract |1= (username) and |2= (content)
    const usernameMatch = params.match(/\|1=([^|]*?)(?:\||$)/);
    const contentMatch = params.match(/\|2=([\s\S]*?)$/);

    if (!usernameMatch) continue;

    const username = usernameMatch[1].trim();
    const content = contentMatch ? contentMatch[1].trim() : '';

    // Skip tally/closing summary messages
    if (TALLY_INDICATORS.some(pattern => pattern.test(content))) {
      continue;
    }

    // Convert wikitext vote images back to Discord emoji format for the vote counter
    const discordContent = content
      .replace(/\[\[File:Voting-support\.svg\|20px\|link=\]\]/g, '<:Voting_support:0>')
      .replace(/\[\[File:Voting-oppose\.svg\|20px\|link=\]\]/g, '<:Voting_oppose:0>')
      .replace(/\[\[File:Voting-restructure\.svg\|20px\|link=\]\]/g, '<:Voting_restructure:0>')
      .replace(/\[\[File:Voting-neutral\.svg\|20px\|link=\]\]/g, '<:Voting_neutral:0>')
      .replace(/<s>/g, '~~').replace(/<\/s>/g, '~~');

    messages.push({
      author: { id: username, username, bot: false },
      content: discordContent,
      timestamp: new Date().toISOString(),
    });
  }

  return messages;
}
