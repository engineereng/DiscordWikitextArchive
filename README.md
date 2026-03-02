# DiscordWikitextArchive

## Overview

DiscordWikitextArchive is a Discord bot designed to archive specific discussion threads, convert them into MediaWiki-compatible wikitext, and automate the mechanical parts of closing meme proposals. It streamlines the process of logging Discord discussions for use on wikis, making it fast, intuitive, and privacy-conscious.

![Discord original](https://github.com/user-attachments/assets/eb03f742-7c46-477b-8c55-2c38640a039a)

![Discord Wikitext Archive](https://github.com/user-attachments/assets/c084c5c7-de55-4920-b7f4-17edbe1ab37f)

## Features

- **Thread Archiving** (`/archive`): Converts Discord thread messages into MediaWiki wikitext, including:
    - Basic formatting (italics, bold, quotes, underlining, spoilers, code blocks).
    - Replies and forwarded messages.
    - Voting emoji conversion.
- **Proposal Closing** (`/close`): Automates the full workflow of closing a meme proposal:
    - Best-effort vote counting with strikethrough crossout detection.
    - Threshold evaluation (75% majority, 7 voter minimum).
    - Preview of all planned changes with confirm/cancel buttons.
    - Discord thread management: rename with `[CLOSED]`/`[NULL]` prefix, apply forum tag (approved/rejected/restructured/not enough votes/closed), archive, and lock.
    - Wiki page edits via MediaWiki API: create log page, update archive, insert row in proposals table, scaffold to-do and progress entries.
    - Links to all created/modified wiki pages in the result message.
- **Privacy Controls**: Restricts commands to authorized roles and specific channels.
- **Participant Mapping**: Maps verified Discord members to their wiki accounts via `/verified_members`.

## Impact

- Serves a **300+ member Discord server**, facilitating over **30 monthly text discussions**.
- Reduces logging time from **1 hour to just 10 seconds**, significantly improving efficiency.
- Automates **5+ wiki page edits** per proposal close, previously done manually.

## Motivation

This project was born out of a need to streamline the logging process for a popular music-related wiki with over 50 active editors. Regular decision-making discussions on Discord often required manual transcription into wikitext, which was time-consuming (30 minutes to 1 hour). The bot provides a simple solution that allows even non-technical moderators to log discussions in seconds using a single command.

## Environment Variables

| Variable | Description |
|---|---|
| `APP_ID` | Discord application ID |
| `DISCORD_TOKEN` | Discord bot token |
| `PUBLIC_KEY` | Discord public key for interaction verification |
| `GUILD_ID` | Discord server (guild) ID |
| `WIKI_API_URL` | MediaWiki API endpoint (e.g. `https://siivagunner.wiki/w/api.php`) |
| `WIKI_USERNAME` | MediaWiki bot password login name (e.g. `Username@BotPasswordName`) |
| `WIKI_PASSWORD` | MediaWiki bot password |

## Commands

| Command | Description |
|---|---|
| `/archive this` | Archive the current thread |
| `/archive thread <id>` | Archive a specific thread by ID |
| `/close` | Close a meme proposal (vote count, archive, wiki edits) |
| `/allowed_channels` | Manage which channels can be archived |
| `/allowed_roles` | Manage which roles can use bot commands |
| `/verified_members` | Manage Discord-to-wiki account mappings |

### `/close` Options

| Option | Required | Description |
|---|---|---|
| `vote_result` | Yes | Outcome: `support`, `oppose`, `restructure`, `null`, or `closed` |
| `summary` | Yes | Short summary of the decision |
| `support_count` | No | Override bot's detected support count |
| `oppose_count` | No | Override bot's detected oppose count |
| `restructure_count` | No | Override bot's detected restructure count |

## Setup

1. Clone the repository and run `npm install`.
2. Copy `.env.example` or create `.env` with the variables listed above.
3. Register commands with Discord: `npm run register`.
4. Start the bot: `npm start` (or `npm run dev` for development with auto-reload).

### Discord Bot Permissions

The bot requires the following OAuth2 scopes and permissions:

- **Scopes**: `bot`, `applications.commands`
- **Permissions**: Manage Roles, Manage Threads, Read Message History, Send Messages, View Channels

For `/close` to rename, tag, archive, and lock threads, the bot must have **Manage Threads** access on the specific forum channel (check channel-level permission overrides).

### Wiki Page Markers

The `/close` command inserts rows into wiki tables by looking for specific HTML comment markers. Add these to the relevant wiki pages:

- **Proposals page** (`SiIvaGunner Wiki:Meme discussion`): `<!--New row goes here-->` before the table's closing `|}`
- **To-do list** (`SiIvaGunner Wiki:Meme discussion/Meme discussion to-do list`): `<!-- Scaffolding` before the scaffold comment block
- **Progress page** (`SiIvaGunner Wiki:Meme discussion/Progress`): `<!-- ...New entries...` before the new entries comment block

### Forum Tags

The bot applies forum tags based on vote result. The forum channel should have tags named (case-insensitive): **approved**, **rejected**, **restructured**, **not enough votes**, **closed**.

## Testing

```bash
npm test
```

Tests cover vote counting (using real wiki log fixtures), threshold evaluation, wikitext generation (proposals rows, archive entries, to-do/progress scaffolds), and ordinal date formatting.

## Project Structure

```
app.js            Express server, interaction routing
archive.js        Thread reading, message formatting, SQLite DB
close.js          /close command handler (preview, confirm, execute)
votecount.js      Vote counting, strikethrough detection, threshold evaluation
wiki.js           MediaWiki API client (login, read, edit)
wikiformat.js     Wikitext generation (log titles, archive entries, scaffolds)
commands.js       Slash command definitions + registration
markdown.js       Discord markdown to wikitext conversion
utils.js          Discord API helpers
```

## Contributing

Contributions and feedback are welcome! If you have suggestions or improvements, feel free to open an issue or pull request on the GitHub repository.
