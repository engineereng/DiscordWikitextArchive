import { DiscordRequest } from './utils.js';
import { promises as fs } from 'fs';
import MarkdownIt from 'markdown-it';

// Initialize markdown-it with custom rendering rules for MediaWiki format
const md = new MarkdownIt({
  html: true  // Enable HTML to support underline and small tags
});

// Disable markdown-it's list, heading, and quote processing
md.disable(['list', 'heading', 'blockquote']);

// Customize rendering rules for MediaWiki format
md.renderer.rules.strong_open = () => "'''";
md.renderer.rules.strong_close = () => "'''";
md.renderer.rules.em_open = () => "''";
md.renderer.rules.em_close = () => "''";
md.renderer.rules.code_inline = (tokens, idx) => `<code>${tokens[idx].content}</code>`;
md.renderer.rules.fence = (tokens, idx) => `<pre>${tokens[idx].content}</pre>`;
md.renderer.rules.code_block = (tokens, idx) => `<pre>${tokens[idx].content}</pre>`;

// List rendering rules for MediaWiki format
md.renderer.rules.bullet_list_open = () => '';
md.renderer.rules.bullet_list_close = () => '';
md.renderer.rules.ordered_list_open = () => '';
md.renderer.rules.ordered_list_close = () => '';

md.renderer.rules.list_item_open = (tokens, idx) => {
  try {
    // Get the current token and its parent
    const token = tokens[idx];
    const parent = token?.parent;

    // Determine if we're in an ordered list
    const isOrdered = parent?.type === 'ordered_list';

    // Calculate nesting level by counting list parents
    let level = 1;  // Start at 1 since we're already in a list
    let current = parent;
    while (current?.parent) {
      if (current.parent.type === 'bullet_list' || current.parent.type === 'ordered_list') {
        level++;
      }
      current = current.parent;
    }

    // For ordered lists, cap at level 2 (# or ##)
    if (isOrdered) {
      level = Math.min(2, level);
    }

    // For ordered lists, use '#', for unordered use '*'
    const marker = isOrdered ? '#' : '*';

    // Add newline if needed
    const needsNewline = idx > 0 && tokens[idx - 1]?.type !== 'bullet_list_open' && tokens[idx - 1]?.type !== 'ordered_list_open';
    const prefix = needsNewline ? '\n' : '';

    return prefix + marker.repeat(level) + ' ';
  } catch (error) {
    console.error('Error in list_item_open:', error);
    return '* '; // Fallback to simple bullet point
  }
};

md.renderer.rules.list_item_close = (tokens, idx) => {
  try {
    // Add newline if this isn't the last item
    const nextToken = tokens[idx + 1];
    const isLastItem = !nextToken ||
      (nextToken.type !== 'list_item_open' &&
       nextToken.type !== 'bullet_list_close' &&
       nextToken.type !== 'ordered_list_close');

    return isLastItem ? '\n' : '';
  } catch (error) {
    console.error('Error in list_item_close:', error);
    return '\n'; // Fallback to newline
  }
};

// Update link rendering to put URL first
md.renderer.rules.link_open = (tokens, idx) => {
  const href = tokens[idx].attrs.find(attr => attr[0] === 'href')[1];
  return `[${href} `;
};
md.renderer.rules.link_close = () => "]";

// Add custom token rule for link_text to skip it (we'll get it from content)
md.renderer.rules.text = (tokens, idx) => {
  // If this text token is inside a link, it's the display text
  if (tokens[idx].level === 1 && tokens[idx-1]?.type === 'link_open') {
    return tokens[idx].content;
  }
  // Otherwise render normally
  return tokens[idx].content;
};

// Add custom processing for underline combinations
const processUnderlineMarkdown = (content) => {
  // Handle __***text***__ (underline + bold + italic)
  content = content.replace(/__([\*]{3}(.*?)[\*]{3})__/g, '<u>\'\'\'\'\'$2\'\'\'\'\'</u>');

  // Handle __**text**__ (underline + bold)
  content = content.replace(/__([\*]{2}(.*?)[\*]{2})__/g, '<u>\'\'\'$2\'\'\'</u>');

  // Handle __*text*__ (underline + italic)
  content = content.replace(/__([\*](.*?)[\*])__/g, '<u>\'\'$2\'\'</u>');

  // Handle __text__ (just underline)
  content = content.replace(/__(.*?)__/g, '<u>$1</u>');

  return content;
};

// Add custom processing for subtext
const processSubtext = (content) => {
  // Handle -# Subtext (convert to <small>Subtext</small>)
  return content.replace(/^-#\s+(.+)$/gm, '<small>$1</small>');
};

// Add custom processing for lists
const processLists = (content) => {
  const lines = content.split('\n');
  const processedLines = [];
  let inList = false;
  let firstIndentLevel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      processedLines.push('');
      continue;
    }

    // Check if this is a list item with indentation
    const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

    if (unorderedMatch || orderedMatch) {
      if (!inList) {
        inList = true;
        // Add blank line before list starts
        processedLines.push('');
      }

      // Get indentation and content
      const [, indent, content] = unorderedMatch || orderedMatch;

      // Count indentation level (Discord uses 2 spaces)
      const indentLevel = Math.floor(indent.length / 2);
      console.log("Line:", line);
      console.log("Indent length:", indent.length);
      console.log("Indent level:", indentLevel);

      // Store the first indent level we see
      if (firstIndentLevel === null) {
        firstIndentLevel = indentLevel;
      }

      // Adjust indent level relative to the first line
      const adjustedLevel = Math.max(0, indentLevel - firstIndentLevel);

      // For ordered lists, only use level 0 or 1
      // For unordered lists, use full indentation
      const finalLevel = orderedMatch
        ? (adjustedLevel > 0 ? 1 : 0)  // Ordered lists: only level 0 or 1
        : adjustedLevel;  // Unordered lists: full indentation

      // Create marker based on list type and indentation
      const marker = (orderedMatch ? '#' : '*').repeat(finalLevel + 1);

      // Add the processed line
      const processedLine = marker + ' ' + content;
      console.log("Processed line:", processedLine);
      processedLines.push(processedLine);
    } else {
      inList = false;
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
};

// Disable markdown-it's list processing
md.disable(['list']);

// Add a custom block rule to prevent markdown-it from processing lists
md.block.ruler.before('list', 'custom_list', (state) => {
  // Check if the line starts with a list marker
  const line = state.src.split('\n')[state.line];
  if (line && line.match(/^(?:[-*]|\d+\.)\s+/)) {
    // Skip this line so markdown-it doesn't process it
    state.line++;
    return true;
  }
  return false;
});

// Add custom processing for headings
const processHeadings = (content) => {
  return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    // Add 1 to header level since Discord's # is h2 (h1 is reserved for page titles)
    const level = Math.min(6, hashes.length + 1);
    return `<h${level}>${text}</h${level}>`;
  });
};

// Add custom processing for quotes
const processQuotes = (content) => {
  return content.replace(/^>\s*(.+)$/gm, ' $1');
};

/**
   * Format a message to wikitext
   * @param {*} message The message to format. Format:
   * @param {Array} authors The array of verified members
   * @param {boolean} simpleDate Whether to use the simple date format (21:56) or the full date format (Fri, 21 Mar 2025 21:56)
   * @returns A string of the message formatted as wikitext
   */
export function formatMessageToWikitext (message, authors, simpleDate = false) {
    const parts = [];
    const timestamp = new Date(message.timestamp).toUTCString();
    const timestampFormatted = simpleDate ? timestamp.slice(16, 22) : timestamp;
    const authorWikiAccount = authors.find(author => author.memberId === message.author.id)?.wikiAccount ?? message.author.username;
    const authorLink = `[[User:${authorWikiAccount}|${authorWikiAccount}]]`;

    parts.push(`*${timestampFormatted}: ${authorLink}:`);

    if (message.content) {
      let content = message.content;
      console.log("Original content:", content);
      const startsWithList = content.match(/^([-*]|\d+\.)\s+/);
      const containsList = content.match(/(?:^|\n)(?:[-*]|\d+\.)\s+/);
      const containsQuotes = content.match(/^>\s+/m);

      // Process quotes first
      content = processQuotes(content);
      console.log("Content after quote processing:", content);

      // Process headings next (but skip lines that look like ordered lists)
      content = content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
        // Skip if this looks like an ordered list (has a number before the period)
        if (text.match(/^\d+\./)) {
          return match;
        }
        return processHeadings(match);
      });
      console.log("Content after heading processing:", content);

      // Process lists next, before any markdown processing
      content = content.replace(/(?:^|\n)(?:[-*]|\d+\.)\s+.*(?:\n(?:\s*[-*]|\s*\d+\.)\s+.*)*$/g, match => {
        // Skip if this looks like a timestamp line
        if (match.match(/^\*[A-Za-z]+,\s+\d+\s+[A-Za-z]+\s+\d{4}/)) {
          return match;
        }
        console.log("Processing list block:", match);
        const processed = processLists(match);
        console.log("Processed list block:", processed);
        return processed;
      });
      console.log("Content after list processing:", content);

      // Then process other Discord-specific formatting
      content = content
        .replace(/^-#\s+(.+)$/gm, match => processSubtext(match))
        .replace(/__([\*]{3}.*?[\*]{3})__|__([\*]{2}.*?[\*]{2})__|__([\*].*?[\*])__|__(.*?)__/g, match => processUnderlineMarkdown(match))
        .replace(/<@!?(\d+)>/g, (match, id) => {
          const member = authors.find(m => m.memberId === id);
          return member ? `[[User:${member.wikiAccount}|${member.displayName}]]` : match;
        })
        .replace(/<#(\d+)>/g, '#$1')
        .replace(/<@&(\d+)>/g, '@$1')
        .replace(/<:([^:]+):(\d+)>/g, ':$1:');
      console.log("Content after Discord formatting:", content);

      // Only use markdown-it if there are no lists or quotes
      let wikitextContent;
      if (!containsList && !containsQuotes) {
        wikitextContent = md.render(content)
          .replace(/<\/?p>/g, '')
          .replace(/\n$/, '');
      } else {
        wikitextContent = content;
      }
      console.log("Content after markdown rendering:", wikitextContent);

      // Process any remaining list items that weren't caught in a block
      if (startsWithList && !content.match(/^\*[A-Za-z]+,\s+\d+\s+[A-Za-z]+\s+\d{4}/)) {
        const lines = wikitextContent.split('\n');
        const firstLine = lines[0];
        if (firstLine.match(/^[-*]\s+/)) {
          lines[0] = '* ' + firstLine.replace(/^[-*]\s+/, '');
        } else if (firstLine.match(/^\d+\.\s+/)) {
          lines[0] = '# ' + firstLine.replace(/^\d+\.\s+/, '');
        }
        wikitextContent = lines.join('\n');
      }
      console.log("Final wikitext content:", wikitextContent);

      // Ensure quotes have proper spacing
      wikitextContent = wikitextContent.split('\n').map(line => {
        if (line.startsWith(' ')) {
          // Preserve exactly one space at the start for quotes
          return ' ' + line.trimLeft();
        }
        return line;
      }).join('\n');

      parts.push(startsWithList ? '\n' + wikitextContent : wikitextContent);
    }

    // Add embed and attachment content
    if (message.embeds?.length > 0) {
      message.embeds.forEach(embed => {
        if (embed.title) parts.push(`[Embed Title] ${embed.title}`);
        if (embed.description) parts.push(`[Embed Description] ${embed.description}`);
        if (embed.url) parts.push(`[Embed URL] ${embed.url}`);
      });
    }

    if (message.attachments?.length > 0) {
      message.attachments.forEach(attachment => {
        parts.push(`[Attachment] ${attachment.url}`);
      });
    }

    const result = parts.join(' ');
    console.log("Final output:", result);
    return result;
  }

/**
 * Read a Discord thread
 * @param {*} threadId The ID of the thread to read
 * @returns A JSON array of messages from the thread
 */
export async function readDiscordThread (threadId) {
    const response = await DiscordRequest(`channels/${threadId}/messages?limit=100`, {
        method: 'GET'
    });
    const messages = await response.json();
    // Log more details about each message
    // messages.forEach(message => {
    //   console.log('Message:', {
    //     type: message.type,
    //     content: message.content,
    //     hasEmbeds: message.embeds?.length > 0,
    //     hasAttachments: message.attachments?.length > 0,
    //     timestamp: message.timestamp,
    //     author: message.author.username,
    //     message_reference: message.message_reference,
    //     components: message.components,
    //     flags: message.flags,
    //     raw: message,
    //     mentions: message.mentions,
    //     mention_roles: message.mention_roles,
    //     pinned: message.pinned,
    //     mention_everyone: message.mention_everyone,
    //     tts: message.tts,
    //     position: message.position,
    //     referenced_message: message.referenced_message
    //   });
    // });

    return messages;
}

export async function getAllowedChannels() {
    const storedChannels = await fs.readFile('allowed_channels.json', 'utf8');
    return JSON.parse(storedChannels);
  }

export async function setAllowedChannels(channels) {
    await fs.writeFile('allowed_channels.json', JSON.stringify(channels));
}

/**
 * Get the roles that are allowed to archive threads
 * @returns A JSON array of role IDs
 */
export async function getAllowedRoles() {
    const storedRoles = await fs.readFile('allowed_roles.json', 'utf8');
    return JSON.parse(storedRoles);
}

/**
 * Set the roles that are allowed to archive threads
 * @param {Array} roles A JSON array of role IDs
 */
export async function setAllowedRoles(roles) {
    await fs.writeFile('allowed_roles.json', JSON.stringify(roles));
}

/**
 * Get the members that are verified
 * @returns An array of objects containing member IDs and wiki accounts
 */
export async function getVerifiedMembers() {
    try {
        const storedMembers = await fs.readFile('verified_members.json', 'utf8');
        const members = JSON.parse(storedMembers);
        // Handle legacy format (array of IDs) by converting to new format
        if (members.length > 0 && typeof members[0] === 'string') {
            return members.map(id => ({ memberId: id, wikiAccount: 'Unknown (Legacy)' }));
        }
        return members;
    } catch (err) {
        return [];
    }
}

/**
 * Set the members that are verified
 * @param {Array} members An array of objects containing member IDs and wiki accounts
 */
export async function setVerifiedMembers(members) {
    await fs.writeFile('verified_members.json', JSON.stringify(members, null, 2));
}

/**
 * Get the roles that are given to verified members
 * @returns A JSON array of role IDs
 */
export async function getVerifiedRoles() {
    const storedRoles = await fs.readFile('verified_members_roles.json', 'utf8');
    return JSON.parse(storedRoles);
}

/**
 * Set the roles that are given to verified members
 * @param {Array} roles A JSON array of role IDs
 */
export async function setVerifiedRoles(roles) {
    await fs.writeFile('verified_members_roles.json', JSON.stringify(roles));
}

/**
 * Add a role to a member
 * @param {string} memberId The ID of the member to add the role to
 * @param {string} guildId The ID of the guild
 * @param {string} roleId The ID of the role to add
 */
export async function addRoleToMember(memberId, guildId, roleId) {
  if (!memberId) throw new Error('memberId is required');
    if (!guildId) throw new Error('guildId is required');
    if (!roleId) throw new Error('roleId is required');

    console.log(`Adding role ${roleId} to member ${memberId} in guild ${guildId}`);

    try {
        const response = await DiscordRequest(`guilds/${guildId}/members/${memberId}/roles/${roleId}`, {
            method: 'PUT'
        });
        console.log('Role added successfully');
        return response;
    } catch (error) {
        console.error('Error adding role:', error);
        throw error;
    }
}

/**
 * Get information about a guild member
 * @param {string} guildId The ID of the guild
 * @param {string} memberId The ID of the member
 * @returns {Promise<Object>} The member object from Discord's API
 */
export async function getMemberInfo(guildId, memberId) {
    if (!guildId) throw new Error('guildId is required');
    if (!memberId) throw new Error('memberId is required');

    try {
        const response = await DiscordRequest(`guilds/${guildId}/members/${memberId}`, {
            method: 'GET'
        });
        return response.json();
    } catch (error) {
        console.error('Error getting member info:', error);
        throw error;
    }
}