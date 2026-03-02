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
  const startDateStr = startDate.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const endDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const currentDateStr = endDateStr;

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
    currentDateStr,
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

  if (!pending) return false;

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

  // Acknowledge immediately with deferred update
  await res.send({
    type: 6, // DEFERRED_UPDATE_MESSAGE
  });

  const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${req.body.token}`;

  try {
    const results = [];

    // 1. Rename thread
    try {
      const newName = `[CLOSED] ${data.threadData.name}`.slice(0, 100);
      await DiscordRequest(`channels/${data.channelId}`, {
        method: 'PATCH',
        body: { name: newName },
      });
      results.push('Thread renamed');
    } catch (e) {
      results.push(`Thread rename failed: ${e.message}`);
    }

    // 2. Lock thread
    try {
      await DiscordRequest(`channels/${data.channelId}`, {
        method: 'PATCH',
        body: { locked: true },
      });
      results.push('Thread locked');
    } catch (e) {
      results.push(`Thread lock failed: ${e.message}`);
    }

    // 3. Wiki edits -- login first
    try {
      await wikiLogin();
    } catch (e) {
      results.push(`Wiki login failed: ${e.message}`);
      await fetch(webhookUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Discord actions done, but wiki login failed:\n${results.join('\n')}\nError: ${e.message}`,
          components: [],
        }),
      });
      return;
    }

    // 4. Create log page
    try {
      const logTitle = logPageTitle(data.day, data.subject);
      await wikiEditPage(logTitle, data.archiveWikitext, `Creating log page for proposal: ${data.subject}`);
      results.push(`Log page created: ${logTitle}`);
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
      await wikiAppendToPage(
        'SiIvaGunner Wiki:Meme discussion/Archive',
        '\n\n' + entry,
        `Adding archive entry for: ${data.subject}`,
      );
      results.push('Archive page updated');
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
        // Find the Ended table and append the row before the table's closing |}
        // This is a best-effort approach -- the human can fix it if needed
        const endedTablePattern = /(\{\|[^\n]*\n(?:.*\n)*?)((?=\|\}))/;
        const updated = proposalsContent + '\n'; // fallback: append if pattern not found
        // For now, append as a comment for human to place correctly
        await wikiAppendToPage(
          'SiIvaGunner Wiki:Meme discussion',
          `\n<!-- Bot: New ended proposal row -->\n<!-- ${row} -->`,
          `Closing proposal: ${data.subject} (${data.voteResult})`,
        );
        results.push('Proposals page updated (row appended as comment for human placement)');
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
        await wikiAppendToPage(
          'SiIvaGunner Wiki:Meme discussion/Meme discussion to-do list',
          `\n|-\n${todo}`,
          `Adding to-do scaffold for: ${data.subject}`,
        );
        results.push('To-do list scaffold added');
      } catch (e) {
        results.push(`To-do scaffold failed: ${e.message}`);
      }

      try {
        const progress = progressRow({
          subject: data.subject,
          day: data.day,
          summary: data.summary,
          currentDate: data.currentDateStr,
        });
        await wikiAppendToPage(
          'SiIvaGunner Wiki:Meme discussion/Progress',
          `\n|-\n${progress}`,
          `Adding progress scaffold for: ${data.subject}`,
        );
        results.push('Progress page scaffold added');
      } catch (e) {
        results.push(`Progress scaffold failed: ${e.message}`);
      }
    }

    // Send final summary
    await fetch(webhookUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**Proposal closed successfully.**\n\n${results.map(r => `• ${r}`).join('\n')}`,
        components: [],
      }),
    });
  } catch (error) {
    console.error('Error executing close:', error);
    await fetch(webhookUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Error executing close: ${error.message}`,
        components: [],
      }),
    });
  }
}
