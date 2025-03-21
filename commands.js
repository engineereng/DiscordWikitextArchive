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
  description: "Archive a thread",
  type: 1,
  integration_types: [0],
  contexts: [0],
  options: [
    {
      name: "this",
      description: "Archive the current thread (must be used inside a thread)",
      type: 1 // SUB_COMMAND
    },
    {
      name: "thread",
      description: "Archive a specific thread",
      type: 1, // SUB_COMMAND
      options: [
        {
          name: "thread",
          description: "The thread to archive",
          type: 7, // 7 is CHANNEL type
          channel_types: [11], // 11 is PUBLIC_THREAD
          required: true
        }
      ]
    }
  ]
};

const ALLOWED_CHANNELS_COMMAND = {
  name: "allowed_channels",
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

const ALLOWED_ROLES_COMMAND = {
  name: "allowed_roles",
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

const VERIFIED_MEMBERS_COMMAND = {
  name: "verified_members",
  description: "Change which members have a wiki account",
  type: 1,
  integration_types: [0],
  contexts: [0],
  options: [
    {
      name: "list",
      description: "List all members with a wiki account",
      type: 1 // 1 is SUB_COMMAND
    },
    {
      name: "add",
      description: "Add a member to the verified list",
      type: 1, // 1 is SUB_COMMAND
      options: [
        {
          name: "member",
          description: "The member to add to the verified list",
          type: 6, // 6 is USER type
          required: true
        }
      ]
    },
    {
      name: "remove",
      description: "Remove a member from the verified list",
      type: 1, // 1 is SUB_COMMAND
      options: [
        {
          name: "member",
          description: "The member to remove from the verified list",
          type: 6, // 6 is USER type
          required: true
        }
      ]
    }
  ]
}
const ALL_COMMANDS = [TEST_COMMAND, ARCHIVE_COMMAND, ALLOWED_CHANNELS_COMMAND, ALLOWED_ROLES_COMMAND, VERIFIED_MEMBERS_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
