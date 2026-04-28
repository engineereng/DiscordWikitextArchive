import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

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

const VERIFIED_MEMBERS_COMMAND = {
  name: "verified_members",
  description: "Change which members have a wiki account",
  type: 1,
  integration_types: [0],
  contexts: [0],
  dm_permission: false, // Cannot be used in DMs
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
        },
        {
          name: "wiki_account",
          description: "The member's wiki account (display name or URL to Fandom wiki page)",
          type: 3, // 3 is STRING type
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
    },
    {
      name: "role",
      description: "Change which role(s) are given to verified members",
      type: 2, // 2 is SUB_COMMAND_GROUP
      options: [
        {
          name: "add",
          description: "Add a role to be given to verified members",
          type: 1, // 1 is SUB_COMMAND
          options: [
            {
              name: "role",
              description: "The role to add",
              type: 8, // 8 is ROLE type
              required: true
            }
          ]
        },
        {
          name: "remove",
          description: "Remove a role from being given to verified members",
          type: 1, // 1 is SUB_COMMAND
          options: [
            {
              name: "role",
              description: "The role to remove",
              type: 8, // 8 is ROLE type
              required: true
            }
          ]
        },
        {
          name: "list",
          description: "List all roles that can be given to verified members",
          type: 1 // 1 is SUB_COMMAND
        }
      ]
    }
  ]
}
const CLOSE_COMMAND = {
  name: "close",
  description: "Close a meme proposal thread: count votes, archive, and update wiki pages",
  type: 1,
  integration_types: [0],
  contexts: [0],
  dm_permission: false,
  options: [
    {
      name: "vote_result",
      description: "The outcome of the proposal",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Support (passed)", value: "support" },
        { name: "Oppose (failed)", value: "oppose" },
        { name: "Restructure (passed with restructure)", value: "restructure" },
        { name: "Null (not enough votes)", value: "null" },
        { name: "Closed (invalid/premature close)", value: "closed" },
      ]
    },
    {
      name: "summary",
      description: "Short summary of the decision (e.g. 'We will create a meme page for X')",
      type: 3, // STRING
      required: true,
    },
    {
      name: "support_count",
      description: "Override the bot's detected support vote count",
      type: 4, // INTEGER
      required: false,
    },
    {
      name: "oppose_count",
      description: "Override the bot's detected oppose vote count",
      type: 4, // INTEGER
      required: false,
    },
    {
      name: "restructure_count",
      description: "Override the bot's detected total restructure vote count",
      type: 4, // INTEGER
      required: false,
    },
  ]
};

const ALL_COMMANDS = [TEST_COMMAND, ARCHIVE_COMMAND, VERIFIED_MEMBERS_COMMAND, CLOSE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
