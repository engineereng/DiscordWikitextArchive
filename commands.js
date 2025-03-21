import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// archive command
const ARCHIVE_COMMAND = {
  name: 'archive',
  description: "Archive this channel",
  type: 1,
  integration_types: [0],
  contexts: [0]
};

const CONFIG_ALLOWED_CHANNELS_COMMAND = {
  name: "config_allowed_channels",
  description: "Change which channels can have their threads archived",
  type: 1,
  integration_types: [0],
  contexts: [0],
  default_member_permissions: "8", // Requires Administrator permission (8)
  dm_permission: false, // Cannot be used in DMs
  options: [
    {
      name: "list",
      description: "List all channels that can have their threads archived",
      type: 1 // 1 is SUB_COMMAND
    },
    {
      name: "add",
      description: "Add a channel to the allowed list",
      type: 1, // 1 is SUB_COMMAND
      options: [
        {
          name: "channel",
          description: "The channel to add to the allowed list",
          type: 7, // 7 is CHANNEL type
          required: true,
          channel_types: [0, 15] // Only text channels (0) and forum channels (15)
        }
      ]
    },
    {
      name: "remove",
      description: "Remove a channel from the allowed list",
      type: 1, // 1 is SUB_COMMAND
      options: [
        {
          name: "channel",
          description: "The channel to remove from the allowed list",
          type: 7, // 7 is CHANNEL type
          required: true,
          channel_types: [0, 15] // Only text channels (0) and forum channels (15)
        }
      ]
    }
  ]
}

const CONFIG_ALLOWED_ROLES_COMMAND = {
  name: "config_allowed_roles",
  description: "Change which roles can archive channels",
  type: 1,
  integration_types: [0],
  contexts: [0],
  default_member_permissions: "8", // Requires Administrator permission (8)
  dm_permission: false, // Cannot be used in DMs
  options: [
    {
      name: "list",
      description: "List all roles that can archive channels",
      type: 1 // 1 is SUB_COMMAND
    },
    {
      name: "add",
      description: "Add a role to the allowed list",
      type: 1, // 1 is SUB_COMMAND
      options: [
        {
          name: "role",
          description: "The role to add to the allowed list",
          type: 8, // 8 is ROLE type
          required: true
        }
      ]
    },
    {
      name: "remove",
      description: "Remove a role from the allowed list",
      type: 1, // 1 is SUB_COMMAND
      options: [
        {
          name: "role",
          description: "The role to remove from the allowed list",
          type: 8, // 8 is ROLE type
          required: true
        }
      ]
    }
  ]
}

const ALL_COMMANDS = [TEST_COMMAND, ARCHIVE_COMMAND, CONFIG_ALLOWED_CHANNELS_COMMAND, CONFIG_ALLOWED_ROLES_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
