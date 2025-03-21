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
import { formatMessageToWikitext, readDiscordThread, getAllowedChannels, setAllowedChannels } from './archive.js';

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

  const getAllowedRoles = async () => {
    const storedRoles = await fs.readFile('allowed_roles.json', 'utf8');
    return JSON.parse(storedRoles);
  }

  const setAllowedRoles = async (roles) => {
    await fs.writeFile('allowed_roles.json', JSON.stringify(roles));
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

      const allowedRoles = await getAllowedRoles();
      // Get user roles from the member object in the interaction
      const userRoles = req.body.member?.roles || [];
      const hasPermission = allowedRoles.some(roleId => userRoles.includes(roleId));
      if (!hasPermission) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: "You do not have permission to archive channels. You need to have a role that is in the allowed roles list.",
          }
        })
      }

      if (type === 11) // 11 is PUBLIC_THREAD. It includes both threads and forum posts.
      {
        // TODO check if the thread is a moot thread or a forum thread
        // check if the thread is in the allowed channels list
        const allowedChannels = await getAllowedChannels();
        const isAllowed = allowedChannels.includes(id);
        if (!isAllowed) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: "This thread is not in the allowed channels list.",
            }
          })
        }
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

      // Get current allowed channels from storage
      let allowedChannels = [];
      try {
        const storedChannels = await getAllowedChannels();
        allowedChannels = storedChannels;
      } catch (err) {
        // File doesn't exist yet or other error, start with empty array
        allowedChannels = [];
      }

      let message;
      if (subcommand === 'list') {
        if (allowedChannels.length === 0) {
          message = "No channels are currently allowed to be archived.";
        } else {
          const channelsList = allowedChannels.map(channelId => `<#${channelId}>`).join('\n');
          message = "Channels that can be archived:\n" + channelsList;
        }
      } else if (subcommand === 'add') {
        const channelId = options[0].options[0].value;

        if (allowedChannels.includes(channelId)) {
          message = `Channel <#${channelId}> is already in the allowed channels list`;
        } else {
          allowedChannels.push(channelId);
          message = `Channel <#${channelId}> added to allowed channels list`;
        }
      } else if (subcommand === 'remove') {
        const channelId = options[0].options[0].value;

        if (allowedChannels.includes(channelId)) {
          allowedChannels.splice(allowedChannels.indexOf(channelId), 1);
          message = `Channel <#${channelId}> removed from allowed channels list`;
        } else {
          message = `Channel <#${channelId}> is not in the allowed channels list`;
        }
      }

      // Save updated channels back to file
      await setAllowedChannels(allowedChannels);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: message,
        }
      });
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
        const storedRoles = await getAllowedRoles();
        allowedRoles = storedRoles;
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

        // Reject @everyone role (which has the same ID as the guild/server ID)
        if (roleId === req.body.guild_id) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: "The @everyone role cannot be added to or removed from the allowed roles list.",
            }
          });
        }

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
        await setAllowedRoles(allowedRoles);
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
