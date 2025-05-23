import { DiscordRequest } from './utils.js';
import { promises as fs } from 'fs';
import {
  convertDiscordToWikitext
} from './markdown.js';

/**
   * Format a message to wikitext
   * @param {*} message The message to format. Format:
   * @param {Array} authors The array of verified members
   * @param {boolean} reply Whether the message is a reply
   * @param {boolean} forwarded Whether the message is a forwarded message
   * @param {boolean} simpleDate Whether to use the simple date format (21:56) or the full date format (Fri, 21 Mar 2025 21:56)
   * @returns A string of the message formatted as wikitext
   */
export function formatMessageToWikitext (message, authors, reply = false, forwarded = false, simpleDate = true) {
    // Format:
    // {{DiscordLog|t=timestamp|authorLink|content}}
    const templatePrefix = `{{DiscordLog2`
    const parts = [];
    parts.push(templatePrefix);

    const timestamp = new Date(message.timestamp).toUTCString();
    const timestampFormatted = simpleDate ? timestamp.slice(16, 22) : timestamp;

    if (message.type === 6) { // Pin message
      parts.push('class=system-message');
      parts.push(`t2=${timestampFormatted}`);
    } else if (reply) { // replies have the class ping-reply and do not have a timestamp
      parts.push('class=ping reply');
    } else {
      parts.push(`t=${timestampFormatted}`);
    }

    let authorWikiAccount = authors.find(author => author.memberId === message.author.id)
    if (!authorWikiAccount) {
        authorWikiAccount = message.author.username;
    } else {
        authorWikiAccount = authorWikiAccount.wikiAccount;
    }
    parts.push(`1=${authorWikiAccount}`);

    if (message.content) {
      const wikitextContent = convertDiscordToWikitext(message.content, authors, forwarded);
      parts.push(`2=${wikitextContent}`);
    } else if (message.type === 6) { // Pin message
      // Pin messages have no content, so we need to add the message ourselves
      parts.push(`2=pinned '''a message''' to this channel. See all '''pinned messages'''`);
    }

    // Add embed and attachment content
    let embeds = [];
    if (message.embeds?.length > 0) {
      message.embeds.forEach(embed => {
        if (embed.title) embeds.push(`[Embed Title] ${embed.title}`);
        if (embed.description) embeds.push(`[Embed Description] ${embed.description}`);
        if (embed.url) embeds.push(`[Embed URL] ${embed.url}`);
      });
    }

    if (message.attachments?.length > 0) {
      message.attachments.forEach(attachment => {
        embeds.push(`[Attachment] ${attachment.url}`);
      });
    }

    // do not render embeds for now
    // if (embeds.length > 0) {
    //     parts.push(`${embeds.join('\n')}`);
    // }

    return parts.join('|') + "}}";
  }

/**
 * Read a Discord thread
 * @param {*} threadId The ID of the thread to read
 * @returns A JSON array of messages from the thread
 */
export async function readDiscordThread(threadId) {
    let allMessages = [];
    let lastMessageId = null;
    const limit = 100; // Discord's maximum limit per request
    let page = 1;
    const delay = 1000; // 1 second delay between requests to be safe

    while (true) {
        // Build the URL with pagination parameters
        let url = `channels/${threadId}/messages?limit=${limit}`;
        if (lastMessageId) {
            url += `&before=${lastMessageId}`;
        }

        // Fetch messages for this page
        const response = await DiscordRequest(url, {
            method: 'GET'
        });
        const messages = await response.json();

        // If no messages returned, we've reached the end
        if (messages.length === 0) {
            console.log(`Finished fetching messages. Total messages: ${allMessages.length}`);
            break;
        }

        // Add messages to our collection
        allMessages = allMessages.concat(messages);

        // Show progress with percentage
        console.log(`Fetched page ${page}: ${messages.length} messages`);

        // If we got less than the limit, we've reached the end
        if (messages.length < limit) {
            console.log(`Finished fetching messages. Total messages: ${allMessages.length}`);
            break;
        }

        // Get the ID of the last message for the next page
        lastMessageId = messages[messages.length - 1].id;
        page++;

        // Add delay before next request to respect rate limits
        if (page > 1) { // Don't delay before the first request
            console.log(`Waiting ${delay/1000} seconds before next request...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return allMessages;
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

/**
 * Format an array of messages with their context (replies and forwards)
 * @param {Array} messages The array of messages to format
 * @param {Array} authors Array of verified members
 * @returns {string} The formatted messages with context
 */
export function formatMessagesWithContext(messages, authors) {
  let result = '';
  let currentDate = null;
  for (const msg of messages) {
    const msgDate = new Date(msg.timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Add date separator if date changed
    if (currentDate !== msgDate) {
      result += `{{DiscordLog2|class=date-separator|t=${msgDate}}}\n`;
      currentDate = msgDate;
    }

    result += formatMessageWithContext(msg, authors);
    if (msg !== messages[messages.length - 1]) {
      result += '\n';
    }
  }

  return result;
}

/**
 * Format a message with its context (replies and forwards)
 * @param {Object} message The message to format
 * @param {Array} authors Array of verified members
 * @returns {string} The formatted message with context
 */
export function formatMessageWithContext(message, authors) {
  const isReply = message.type === 19;
  const isForwarded = message.message_reference?.type === 1;

  if (isReply) {
    // Handle reply message
    const referencedMessage = message.referenced_message;
    if (referencedMessage) {
      if (referencedMessage.message_snapshots && referencedMessage.message_snapshots.length > 0) {
        // Handle a reply to a forwarded message
        const messageSnapshot = referencedMessage.message_snapshots[0].message;
        messageSnapshot.author = referencedMessage.author;
        return formatMessageToWikitext(messageSnapshot, authors, true, true) + "\n" +
               formatMessageToWikitext(message, authors);
      } else {
        // Handle reply-only message
        return formatMessageToWikitext(referencedMessage, authors, true) + "\n" +
               formatMessageToWikitext(message, authors);
      }
    } else {
      console.error("This reply message has no referenced message:", message);
      return formatMessageToWikitext(message, authors);
    }
  } else if (isForwarded) {
    // Handle forwarded-only message
    let messageSnapshot = message.message_snapshots[0].message;
    messageSnapshot.author = message.author; // message_snapshots don't have author info, so set as the forwarded message's author
    return formatMessageToWikitext(messageSnapshot, authors, false, true);
  } else {
    // handle normal messages
    return formatMessageToWikitext(message, authors); // normal message
  }
}