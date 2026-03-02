import { DiscordRequest } from './utils.js';
import {
  formatMessagesWithContext,
  readDiscordThread,
  getVerifiedMembers,
} from './archive.js';
import { countVotes, evaluateThreshold } from './votecount.js';
import {
  toOrdinal,
  logPageTitle,
  archiveAnchor,
  proposalsPageRow,
  archiveEntry,
  todoRow,
  progressRow,
} from './wikiformat.js';
import { wikiLogin, wikiReadPage, wikiEditPage, wikiAppendToPage } from './wiki.js';

// In-memory store for pending close confirmations (keyed by interaction custom_id)
const pendingCloses = new Map();

/**
 * Look up a Discord user ID in verified_members to get their wiki account name.
 */
function lookupWikiAccount(authors, discordUserId) {
  const member = authors.find(a => a.memberId === discordUserId);
  return member ? member.wikiAccount : null;
}

/**
 * Get the option value from a slash command's options array.
 */
function getOption(options, name) {
  const opt = options?.find(o => o.name === name);
  return opt ? opt.value : undefined;
}

/**
 * Extract the proposal subject from a thread name.
 * Thread names often follow patterns like "Meatball Parade" or "22nd: Meatball Parade".
 */
function extractSubject(threadName) {
  // Remove [CLOSED] prefix if present
  let name = threadName.replace(/^\[CLOSED\]\s*/i, '');
  // Remove ordinal prefix like "22nd: " if present
  name = name.replace(/^\d+(?:st|nd|rd|th):\s*/, '');
  return name.trim();
}

/**
 * Handle the /close command. Sends the deferred response immediately,
 * then does all heavy work in a detached promise so Express returns right away.
 */
export async function handleCloseCommand(req, res) {
  const { data, channel } = req.body;
  const { options } = data;
  const channelType = channel?.type;
  const channelId = channel?.id;

  // Must be used inside a thread
  if (channelType !== 11) {
    return res.send({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        flags: 64, // EPHEMERAL
        content: 'The `/close` command must be used inside a forum thread.',
      },
    });
  }

  // Send deferred response immediately so Discord doesn't time out
  res.send({
    type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    data: { flags: 64 },
  });

  // Do all heavy work in a detached promise
  const token = req.body.token;
  const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${token}`;

  processClose({ options, channelId, token, webhookUrl }).catch(error => {
    console.error('Error in /close command:', error);
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Error: ${error.message}`,
        flags: 64,
      }),
    }).catch(e => console.error('Failed to send error follow-up:', e));
  });
}

/**
 * The actual close processing logic, runs after the deferred response is sent.
 */
async function processClose({ options, channelId, token, webhookUrl }) {
  // Parse options
  const voteResult = getOption(options, 'vote_result');
  const summary = getOption(options, 'summary');
  const supportOverride = getOption(options, 'support_count');
  const opposeOverride = getOption(options, 'oppose_count');
  const restructureOverride = getOption(options, 'restructure_count');

  // Get thread data
  const threadRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
  });
  if (!threadRes.ok) throw new Error('Could not fetch thread data');
  const threadData = await threadRes.json();

  const subject = extractSubject(threadData.name);
  const threadCreatorId = threadData.owner_id;
  const startDate = new Date(threadData.thread_metadata?.create_timestamp || threadData.id);

  // Read thread messages
  const messages = await readDiscordThread(channelId);
  const authors = await getVerifiedMembers();

  // Count votes
  const messagesOldestFirst = [...messages].reverse();
  const voteData = countVotes(messagesOldestFirst);

  // Apply overrides
  const finalSupport = supportOverride ?? voteData.tally.support;
  const finalOppose = opposeOverride ?? voteData.tally.oppose;
  const finalRestructure = restructureOverride ?? voteData.tally.restructure;
  const finalTotal = finalSupport + finalOppose + finalRestructure;

  // Evaluate threshold
  const threshold = evaluateThreshold(finalSupport, finalOppose, finalRestructure);

  // Look up proposer's wiki account
  const proposerWiki = lookupWikiAccount(authors, threadCreatorId);
  const proposerDisplay = proposerWiki || `Unknown (Discord ID: ${threadCreatorId})`;

  // Format dates
  const day = startDate.getUTCDate();
  const now = new Date();
  const shortDate = (d) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  const longDate = (d) => d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const startDateStr = shortDate(startDate);
  const endDateStr = shortDate(now);
  const currentDateLong = longDate(now);

  // Generate archive wikitext
  const nonBotMessages = messagesOldestFirst.filter(m => !m.author.bot);
  const archiveWikitext = `<templatestyles src="Template:DiscordLog/styles.css"/>\n` +
    formatMessagesWithContext(nonBotMessages, authors);

  // Build preview
  let preview = '**Proposal Close Preview**\n\n';
  preview += `**Subject:** ${subject}\n`;
  preview += `**Proposer:** ${proposerDisplay}\n`;
  preview += `**Start date:** ${startDateStr}\n`;
  preview += `**End date:** ${endDateStr}\n`;
  preview += `**Vote result:** ${voteResult}\n`;
  preview += `**Summary:** ${summary}\n\n`;

  preview += `**Vote Tally** (bot-detected → final):\n`;
  preview += `  Support: ${voteData.tally.support}${supportOverride !== undefined ? ` → ${supportOverride}` : ''}\n`;
  preview += `  Oppose: ${voteData.tally.oppose}${opposeOverride !== undefined ? ` → ${opposeOverride}` : ''}\n`;
  preview += `  Restructure: ${voteData.tally.restructure}${restructureOverride !== undefined ? ` → ${restructureOverride}` : ''}\n`;
  if (voteData.tally.neutral > 0) {
    preview += `  Neutral: ${voteData.tally.neutral} (not counted toward total)\n`;
  }
  preview += `  **Total: ${finalTotal}**\n`;
  preview += `  Bot suggestion: **${threshold.result}** (${threshold.reason})\n\n`;

  if (voteData.ambiguous.length > 0) {
    preview += `**Ambiguous voters** (crossed out with no replacement):\n`;
    for (const a of voteData.ambiguous) {
      preview += `  - ${a.username}\n`;
    }
    preview += '\n';
  }

  if (voteData.voters.restructure.length > 0) {
    preview += `**Restructure voters** (human must group into options):\n`;
    for (const v of voteData.voters.restructure) {
      const snippet = v.messageContent.slice(0, 100).replace(/\n/g, ' ');
      preview += `  - ${v.username}: ${snippet}...\n`;
    }
    preview += '\n';
  }

  if (!proposerWiki) {
    preview += `**Warning:** Could not find wiki account for thread creator (${threadCreatorId}). The proposer column will show the Discord ID.\n\n`;
  }

  preview += '**Planned actions:**\n';
  preview += `1. Rename thread to "[CLOSED] ${threadData.name}"\n`;
  preview += `2. Lock thread\n`;
  preview += `3. Create log page: \`${logPageTitle(day, subject)}\`\n`;
  preview += `4. Update archive page\n`;
  preview += `5. Update proposals page (Active → Ended)\n`;
  if (voteResult === 'support' || voteResult === 'restructure') {
    preview += `6. Create scaffold entry on to-do list\n`;
    preview += `7. Create scaffold entry on progress page\n`;
  }

  // Store pending data
  const confirmId = `close_confirm_${channelId}_${Date.now()}`;
  const cancelId = `close_cancel_${channelId}_${Date.now()}`;

  pendingCloses.set(confirmId, {
    channelId,
    threadData,
    subject,
    day,
    proposer: proposerDisplay,
    startDateStr,
    endDateStr,
    currentDateLong,
    voteResult,
    summary,
    supportCount: finalSupport,
    opposeCount: finalOppose,
    restructureCount: finalRestructure,
    archiveWikitext,
    token,
    cancelId,
  });
  pendingCloses.set(cancelId, { confirmId, type: 'cancel' });

  // Auto-expire after 15 minutes
  setTimeout(() => {
    pendingCloses.delete(confirmId);
    pendingCloses.delete(cancelId);
  }, 15 * 60 * 1000);

  // Send preview with buttons
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: preview,
      flags: 64,
      components: [{
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 3, // SUCCESS (green)
            label: 'Confirm',
            custom_id: confirmId,
          },
          {
            type: 2,
            style: 4, // DANGER (red)
            label: 'Cancel',
            custom_id: cancelId,
          },
        ],
      }],
    }),
  });
}

/**
 * Handle a button interaction for close confirm/cancel.
 * @returns {boolean} true if the interaction was handled, false if not a close button
 */
export async function handleCloseButton(req, res) {
  const customId = req.body.data.custom_id;
  const pending = pendingCloses.get(customId);

  if (!pending) {
    return res.send({
      type: 7, // UPDATE_MESSAGE
      data: {
        content: 'This close operation has already been processed or expired.',
        components: [],
        flags: 64,
      },
    });
  }

  if (pending.type === 'cancel') {
    // Cancel
    pendingCloses.delete(pending.confirmId);
    pendingCloses.delete(customId);
    return res.send({
      type: 7, // UPDATE_MESSAGE
      data: {
        content: 'Close operation cancelled.',
        components: [],
        flags: 64,
      },
    });
  }

  // Confirm -- execute all changes
  const data = pending;
  pendingCloses.delete(customId);
  pendingCloses.delete(data.cancelId);

  // Immediately update the message to show processing state
  res.send({
    type: 7, // UPDATE_MESSAGE
    data: {
      content: '**Processing proposal close...**',
      components: [],
      flags: 64,
    },
  });

  // Do heavy work in a detached promise so Express returns immediately
  const followupUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${req.body.token}`;

  executeClose(data, followupUrl).catch(error => {
    console.error('Error executing close:', error);
    fetch(followupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Error executing close: ${error.message}`,
        flags: 64,
      }),
    }).catch(e => console.error('Failed to send error follow-up:', e));
  });
}

/**
 * Map vote result to the expected forum tag name.
 */
const TAG_NAME_MAP = {
  support: 'approved',
  oppose: 'rejected',
  restructure: 'restructured',
  null: 'not enough votes',
  closed: 'closed',
};

/**
 * Map vote result to thread name prefix.
 */
const PREFIX_MAP = {
  support: '[CLOSED]',
  oppose: '[CLOSED]',
  restructure: '[CLOSED]',
  null: '[NULL]',
  closed: '[CLOSED]',
};

/**
 * Execute all close actions (Discord + Wiki) and send a follow-up with results.
 */
async function executeClose(data, followupUrl) {
  const results = [];

  // 1. Fetch parent forum channel to get available tags
  let tagId = null;
  try {
    const parentId = data.threadData.parent_id;
    const forumRes = await DiscordRequest(`channels/${parentId}`, { method: 'GET' });
    const forumData = await forumRes.json();
    const availableTags = forumData.available_tags || [];
    const targetTagName = TAG_NAME_MAP[data.voteResult] || '';
    const matchedTag = availableTags.find(
      t => t.name.toLowerCase() === targetTagName.toLowerCase()
    );
    if (matchedTag) {
      tagId = matchedTag.id;
    } else {
      results.push(`Tag "${targetTagName}" not found on forum (available: ${availableTags.map(t => t.name).join(', ')})`);
    }
  } catch (e) {
    results.push(`Failed to fetch forum tags: ${e.message}`);
  }

  // 2. Rename, tag, archive, and lock thread in a single PATCH
  try {
    const prefix = PREFIX_MAP[data.voteResult] || '[CLOSED]';
    const newName = `${prefix} ${data.threadData.name}`.slice(0, 100);
    const patchBody = {
      name: newName,
      archived: true,
      locked: true,
    };
    if (tagId) {
      patchBody.applied_tags = [tagId];
    }
    await DiscordRequest(`channels/${data.channelId}`, {
      method: 'PATCH',
      body: patchBody,
    });
    const tagNote = tagId ? ', tagged' : '';
    results.push(`Thread renamed, closed${tagNote}, and locked`);
  } catch (e) {
    results.push(`Thread update failed: ${e.message}`);
  }

  // 3. Wiki edits -- login first
  try {
    await wikiLogin();
  } catch (e) {
    results.push(`Wiki login failed: ${e.message}`);
    await fetch(followupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**Proposal close partially failed.**\n\n${results.map(r => `• ${r}`).join('\n')}`,
        flags: 64,
      }),
    });
    return;
  }

  const wikiBase = process.env.WIKI_API_URL.replace('/w/api.php', '/wiki/');
  const wikiLink = (title) => `${wikiBase}${encodeURIComponent(title).replace(/%2F/g, '/').replace(/%3A/g, ':')}`;

  // 4. Create log page
  try {
    const logTitle = logPageTitle(data.day, data.subject);
    await wikiEditPage(logTitle, data.archiveWikitext, `Creating log page for proposal: ${data.subject}`);
    results.push(`[Log page created](${wikiLink(logTitle)})`);
  } catch (e) {
    results.push(`Log page creation failed: ${e.message}`);
  }

  // 5. Update archive page
  try {
    const entry = archiveEntry({
      subject: data.subject,
      day: data.day,
      summary: data.summary,
      voteResult: data.voteResult,
      supportCount: data.supportCount,
      opposeCount: data.opposeCount,
      restructureCount: data.restructureCount,
    });
    const archiveTitle = 'SiIvaGunner Wiki:Meme discussion/Archive';
    await wikiAppendToPage(
      archiveTitle,
      '\n\n' + entry,
      `Adding archive entry for: ${data.subject}`,
    );
    const anchor = archiveAnchor(data.day, data.subject);
    results.push(`[Archive page updated](${wikiLink(archiveTitle)}#${encodeURIComponent(anchor)})`);
  } catch (e) {
    results.push(`Archive update failed: ${e.message}`);
  }

  // 6. Update proposals page (Active → Ended)
  try {
    const row = proposalsPageRow({
      subject: data.subject,
      day: data.day,
      proposer: data.proposer,
      startDate: data.startDateStr,
      endDate: data.endDateStr,
      voteResult: data.voteResult,
    });

    const proposalsContent = await wikiReadPage('SiIvaGunner Wiki:Meme discussion');
    if (proposalsContent) {
      const marker = '<!--New row goes here-->';
      const markerIndex = proposalsContent.indexOf(marker);

      if (markerIndex !== -1) {
        const newContent = proposalsContent.slice(0, markerIndex)
          + `|-\n${row}\n${marker}`
          + proposalsContent.slice(markerIndex + marker.length);

        await wikiEditPage(
          'SiIvaGunner Wiki:Meme discussion',
          newContent,
          `Closing proposal: ${data.subject} (${data.voteResult})`,
        );
        results.push(`[Proposals page updated](${wikiLink('SiIvaGunner Wiki:Meme discussion')})`);
      } else {
        await wikiAppendToPage(
          'SiIvaGunner Wiki:Meme discussion',
          `\n|-\n${row}`,
          `Closing proposal: ${data.subject} (${data.voteResult})`,
        );
        results.push(`[Proposals page updated](${wikiLink('SiIvaGunner Wiki:Meme discussion')}) (marker not found, row appended)`);
      }
    }
  } catch (e) {
    results.push(`Proposals page update failed: ${e.message}`);
  }

  // 7. To-do and progress scaffolds (only for support/restructure)
  if (data.voteResult === 'support' || data.voteResult === 'restructure') {
    try {
      const todo = todoRow({
        subject: data.subject,
        day: data.day,
        summary: data.summary,
      });
      const todoTitle = 'SiIvaGunner Wiki:Meme discussion/Meme discussion to-do list';
      const todoContent = await wikiReadPage(todoTitle);
      const todoMarker = '<!-- Scaffolding';

      if (todoContent && todoContent.includes(todoMarker)) {
        const idx = todoContent.indexOf(todoMarker);
        const newContent = todoContent.slice(0, idx)
          + `|-\n${todo}\n${todoMarker}`
          + todoContent.slice(idx + todoMarker.length);
        await wikiEditPage(todoTitle, newContent, `Adding to-do scaffold for: ${data.subject}`);
        results.push(`[To-do list scaffold added](${wikiLink(todoTitle)})`);
      } else {
        await wikiAppendToPage(todoTitle, `\n|-\n${todo}`, `Adding to-do scaffold for: ${data.subject}`);
        results.push(`[To-do list scaffold added](${wikiLink(todoTitle)}) (marker not found, row appended)`);
      }
    } catch (e) {
      results.push(`To-do scaffold failed: ${e.message}`);
    }

    try {
      const progress = progressRow({
        subject: data.subject,
        day: data.day,
        summary: data.summary,
        currentDate: data.currentDateLong,
      });
      const progressTitle = 'SiIvaGunner Wiki:Meme discussion/Progress';
      const progressContent = await wikiReadPage(progressTitle);
      const progressMarker = '<!-- ...New entries...';

      if (progressContent && progressContent.includes(progressMarker)) {
        const idx = progressContent.indexOf(progressMarker);
        const newContent = progressContent.slice(0, idx)
          + `|-\n${progress}\n${progressMarker}`
          + progressContent.slice(idx + progressMarker.length);
        await wikiEditPage(progressTitle, newContent, `Adding progress scaffold for: ${data.subject}`);
        results.push(`[Progress page scaffold added](${wikiLink(progressTitle)})`);
      } else {
        await wikiAppendToPage(progressTitle, `\n|-\n${progress}`, `Adding progress scaffold for: ${data.subject}`);
        results.push(`[Progress page scaffold added](${wikiLink(progressTitle)}) (marker not found, row appended)`);
      }
    } catch (e) {
      results.push(`Progress scaffold failed: ${e.message}`);
    }
  }

  // Send results as a follow-up message
  const resp = await fetch(followupUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `**Proposal closed successfully.**\n\n${results.map(r => `• ${r}`).join('\n')}`,
      flags: 64,
    }),
  });
  if (!resp.ok) {
    console.error('Failed to send close results:', resp.status, await resp.text());
  }
}
