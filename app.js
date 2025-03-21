import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji } from './utils.js';
import { formatMessageToWikitext, readDiscordThread, getAllowedChannels, setAllowedChannels, getAllowedRoles, setAllowedRoles } from './archive.js';

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
      const {type, id: channelId} = channel;

      // Get and verify user permissions first
      const allowedRoles = await getAllowedRoles();
      const userRoles = req.body.member?.roles || [];
      const hasPermission = allowedRoles.some(roleId => userRoles.includes(roleId));
      if (!hasPermission) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL,
            content: "You do not have permission to archive threads. You need to have a role that is in the allowed roles list.",
          }
        });
      }

      // Get the subcommand and thread ID
      const subcommand = options[0].name;
      let threadId;

      if (subcommand === 'this') {
        // When using /archive this, we must be inside a thread
        if (type !== 11) { // 11 is PUBLIC_THREAD
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: "The '/archive this' command can only be used inside a public thread.",
            }
          });
        }
        threadId = channelId;
      } else if (subcommand === 'thread') {
        // When using /archive thread <id>, use the provided thread ID
        threadId = options[0].options[0].value;
      }

      // Send initial response
      await res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: "Processing your archive request...",
        }
      });

      try {
        // Get the thread's data to check its parent
        const response = await fetch(`https://discord.com/api/v10/channels/${threadId}`, {
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          },
        });

        if (!response.ok) {
          const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${req.body.token}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: "Could not find the specified thread. Make sure the ID is correct and the bot has access to it.",
              flags: InteractionResponseFlags.EPHEMERAL
            })
          });
          return;
        }

        const threadData = await response.json();

        // Verify it's a thread
        if (threadData.type !== 11) {
          const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${req.body.token}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: "The specified channel is not a thread.",
              flags: InteractionResponseFlags.EPHEMERAL
            })
          });
          return;
        }

        // Check if the thread's parent channel is in the allowed list
        const allowedChannels = await getAllowedChannels();
        const isAllowed = allowedChannels.includes(threadData.parent_id);
        if (!isAllowed) {
          const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${req.body.token}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: "This thread's parent channel is not in the allowed channels list.",
              flags: InteractionResponseFlags.EPHEMERAL
            })
          });
          return;
        }

        // Archive the thread
        const messages = await readDiscordThread(threadId);
        // Filter out bot messages and reverse the order
        const messagesReversed = messages
          .filter(message => !message.author.bot) // Remove bot messages
          .reverse();
        const fileContent = messagesReversed.map(message => {
          return formatMessageToWikitext(message);
        }).join('\n\n');

        // Create a buffer from the content
        const buffer = Buffer.from(fileContent, 'utf8');

        // Get thread name for the filename
        const threadName = threadData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        // Send follow-up with file
        const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${req.body.token}`;
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({
          content: "Here's the archived thread content:",
          flags: InteractionResponseFlags.EPHEMERAL
        }));
        formData.append('file', new Blob([buffer]), `${threadName}.txt`);

        await fetch(webhookUrl, {
          method: 'POST',
          body: formData
        });

        return;

      } catch (error) {
        console.error('Error processing archive request:', error);
        const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${req.body.token}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: "An error occurred while trying to archive the thread.",
            flags: InteractionResponseFlags.EPHEMERAL
          })
        });
        return;
      }
    }

    if (name === 'allowed_channels') {
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

    if (name === 'allowed_roles') {
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
