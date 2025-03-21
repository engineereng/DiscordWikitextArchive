import { DiscordRequest } from './utils.js';
import { promises as fs } from 'fs';
import {
  contentStartsWith,
  contentContains,
  processQuotes,
  processHeadings,
  processLists,
  processTemplates,
  processSubtext,
  processUnderlineMarkdown,
  renderContent,
} from './markdown.js';

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
      const startsWithList = contentStartsWith.list(content);
      const startsWithQuote = contentStartsWith.quote(content);
      const containsList = contentContains.list(content);
      const containsQuotes = contentContains.quote(content);

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

      // Process templates before other Discord-specific formatting
      content = processTemplates(content);
      console.log("Content after template processing:", content);

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

      // Render markdown content
      let wikitextContent = renderContent(content, { containsList, containsQuotes });
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

      parts.push(startsWithList || startsWithQuote ? '\n' + wikitextContent : wikitextContent);
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