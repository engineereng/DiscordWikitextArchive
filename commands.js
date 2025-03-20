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
  description: "Change which channels can be archived",
  type: 1,
  integration_types: [0],
  contexts: [0]
}

const ALL_COMMANDS = [TEST_COMMAND, ARCHIVE_COMMAND, CONFIG_ALLOWED_CHANNELS_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
