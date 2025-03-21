import { DiscordRequest } from './utils.js';
import { promises as fs } from 'fs';
/**
   * Format a message to wikitext
   * @param {*} message The message to format. Format:
   * @param {boolean} simpleDate Whether to use the simple date format (21:56) or the full date format (Fri, 21 Mar 2025 21:56)
   * @returns A string of the message formatted as wikitext
   */
export function formatMessageToWikitext (message, simpleDate = false) {
    // Wanted format:
    // *21:56: [[User:Ironwestie|Ironwestie]]: Hello all.
    // *21:56: [[User:Brunocoolgamers|Brunocoolgamers]]: hii
    // *21:56: [[User:Pokemonfreak777|Pokemonfreak777]]: hello
    const parts = [];
    // Add timestamp and author
    const timestamp = new Date(message.timestamp).toUTCString();
    // timestamp is in format: Fri, 21 Mar 2025 21:56:00 GMT
    // we want to format it to: 21:56
    const timestampFormatted = simpleDate ? timestamp.slice(16, 22) : timestamp;

    // TODO map the author to a wikitext link based on the username
    parts.push(`*${timestampFormatted}: ${message.author.username}:`);

    // Add text content if it exists
    if (message.content) {
      // TODO format content based on the content (see moot_compact.py)
      parts.push(message.content);
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