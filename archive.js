import { DiscordRequest } from './utils.js';
import { promises as fs } from 'fs';
import MarkdownIt from 'markdown-it';

// Initialize markdown-it with custom rendering rules for MediaWiki format
const md = new MarkdownIt({
  html: true  // Enable HTML to support underline tags
});

// Customize rendering rules for MediaWiki format
md.renderer.rules.strong_open = () => "'''";
md.renderer.rules.strong_close = () => "'''";
md.renderer.rules.em_open = () => "''";
md.renderer.rules.em_close = () => "''";
md.renderer.rules.code_inline = (tokens, idx) => `<code>${tokens[idx].content}</code>`;
md.renderer.rules.link_open = (tokens, idx) => {
  const href = tokens[idx].attrs.find(attr => attr[0] === 'href')[1];
  return `[${href} `;
};
md.renderer.rules.link_close = () => "]";

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

/**
   * Format a message to wikitext
   * @param {*} message The message to format. Format:
   * @param {Array} authors The array of verified members
   * @param {boolean} simpleDate Whether to use the simple date format (21:56) or the full date format (Fri, 21 Mar 2025 21:56)
   * @returns A string of the message formatted as wikitext
   */
export function formatMessageToWikitext (message, authors, simpleDate = false) {
    // Wanted format:
    // *21:56: [[User:Ironwestie|Ironwestie]]: Hello all.
    // *21:56: [[User:Brunocoolgamers|Brunocoolgamers]]: hii
    // *21:56: [[User:Pokemonfreak777|Pokemonfreak777]]: hello

    // {{DiscordLog|t=21:}}
    const parts = [];
    // Add timestamp and author
    const timestamp = new Date(message.timestamp).toUTCString();
    // timestamp is in format: Fri, 21 Mar 2025 21:56:00 GMT
    // we want to format it to: 21:56
    const timestampFormatted = simpleDate ? timestamp.slice(16, 22) : timestamp;

    // map the author to a wikitext link based on the username
    const authorWikiAccount = authors.find(author => author.memberId === message.author.id)?.wikiAccount ?? message.author.username;
    const authorLink = `[[User:${authorWikiAccount}|${authorWikiAccount}]]`;

    parts.push(`*${timestampFormatted}: ${authorLink}:`);

    // Add text content if it exists
    if (message.content) {
      // Convert Discord markdown to wikitext
      let content = message.content;

      // Handle Discord-specific formatting before markdown conversion
      content = content
        // Process underline combinations first
        .replace(/__([\*]{3}.*?[\*]{3})__|__([\*]{2}.*?[\*]{2})__|__([\*].*?[\*])__|__(.*?)__/g, match => {
          // Pre-process the underline combinations
          return processUnderlineMarkdown(match);
        })
        // Discord user mentions
        .replace(/<@!?(\d+)>/g, (match, id) => {
          const member = authors.find(m => m.memberId === id);
          return member ? `[[User:${member.wikiAccount}|${member.displayName}]]` : match;
        })
        // Discord channel mentions
        .replace(/<#(\d+)>/g, '#$1')
        // Discord role mentions
        .replace(/<@&(\d+)>/g, '@$1')
        // Discord custom emojis
        .replace(/<:([^:]+):(\d+)>/g, ':$1:');

      // Convert markdown to wikitext
      const wikitextContent = md.render(content)
        // Clean up any HTML that might have been generated
        .replace(/<\/?p>/g, '')
        .replace(/\n$/, '');

      parts.push(wikitextContent);
    }

    // Add embed content if it exists
    if (message.embeds?.length > 0) {
      message.embeds.forEach(embed => {
        if (embed.title) parts.push(`[Embed Title] ${embed.title}`);
        if (embed.description) parts.push(`[Embed Description] ${embed.description}`);
        if (embed.url) parts.push(`[Embed URL] ${embed.url}`);
      });
    }

    // Add attachment URLs if they exist
    if (message.attachments?.length > 0) {
      message.attachments.forEach(attachment => {
        parts.push(`[Attachment] ${attachment.url}`);
      });
    }

    return parts.join(' ');
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