import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { promises as fs } from 'fs';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction type and data
  const { type, data, channel } = req.body;

  /**
   * Read a Discord thread
   * @param {*} threadId The ID of the thread to read
   * @returns A JSON array of messages from the thread
   */
  const readDiscordThread = async (threadId) => {
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

  /**
   * Format a message to wikitext
   * @param {*} message The message to format. Format:
   * @param {boolean} simpleDate Whether to use the simple date format (21:56) or the full date format (Fri, 21 Mar 2025 21:56)
   * @returns A string of the message formatted as wikitext
   */
  const formatMessageToWikitext = (message, simpleDate = false) => {
    // Wanted format:
    // *21:56: [[User:Ironwestie|Ironwestie]]: Hello all.
    // *21:56: [[User:Brunocoolgamers|Brunocoolgamers]]: hii
    // *21:56: [[User:Pokemonfreak777|Pokemonfreak777]]: hello
    const parts = [];
    // Add timestamp and author
    const timestamp = new Date(message.timestamp).toUTCString();
    console.log(timestamp);
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
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: `hello world ${getRandomEmoji()}`,
        },
      });
    }

    if (name === 'archive') {
      const {type, id} = channel;

      if (type === 11) // 11 is PUBLIC_THREAD
      {
        // TODO check if the thread is a moot thread or a forum thread
        const messages = await readDiscordThread(id);
        // Reverse the messages array
        const messagesReversed = messages.reverse();
        const fileContent = "```\n" + messagesReversed.map(message => {
          return formatMessageToWikitext(message);
        }).join('\n\n') + "\n```";

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: fileContent || "No content found in thread.",
          }
        })
      } else {
          // Refuse to archive the current channel
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              //
              flags: InteractionResponseFlags.EPHEMERAL,
              content: "You may only archive threads and forums",
            }
          })
      }
    }

    if (name === 'config_allowed_channels') {
      // TODO update the allowed channels
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Allowed channels updated",
        }
      })
    }

    if (name === 'config_allowed_roles') {
      // Check if we have options
      if (!options || !options[0]) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "No subcommand specified",
          }
        });
      }

      const subcommand = options[0].name; // 'add', 'remove', or 'list'

      // Get current allowed roles from storage
      let allowedRoles = [];
      try {
        const storedRoles = await fs.readFile('allowed_roles.json', 'utf8');
        allowedRoles = JSON.parse(storedRoles);
      } catch (err) {
        // File doesn't exist yet or other error, start with empty array
        allowedRoles = [];
      }

      let message;
      if (subcommand === 'list') {
        if (allowedRoles.length === 0) {
          message = "No roles are currently allowed to archive channels.";
        } else {
          const rolesList = allowedRoles.map(roleId => `<@&${roleId}>`).join('\n');
          message = "Roles that can archive channels:\n" + rolesList;
        }
      } else {
        const roleId = options[0].options[0].value;
        const roleName = `<@&${roleId}>`; // Format as a role mention

        if (subcommand === 'add') {
          if (allowedRoles.includes(roleId)) {
            message = `Role ${roleName} is already in the allowed roles list`;
          } else {
            allowedRoles.push(roleId);
            message = `Role ${roleName} added to allowed roles list`;
          }
        } else if (subcommand === 'remove') {
          const roleIndex = allowedRoles.indexOf(roleId);
          if (roleIndex > -1) {
            allowedRoles.splice(roleIndex, 1);
            message = `Role ${roleName} removed from allowed roles list`;
          } else {
            message = `Role ${roleName} is not in the allowed roles list`;
          }
        }

        // Save updated roles back to file
        await fs.writeFile('allowed_roles.json', JSON.stringify(allowedRoles));
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: message,
        }
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
