## Commands and set up

### Overview
The Discord Archive Bot is designed to archive specific discussion threads from Discord to a wiki format.

### Commands

#### Archive Commands
These commands are used to archive Discord discussions. They can only be used in specific channels and require one of the "allowed list" roles.

- `/archive this` - Archives the current thread
- `/archive thread <thread>` - Archives a specific thread (Note: Discord won't show closed threads in the picklist)

#### Verification Commands
These commands manage member verification and wiki account associations.

- `/verified_members list` - Lists all verified members
- `/verified_members add <user> <wiki_account>` - Adds a Discord user to the verified members list and associates their wiki account
- `/verified_members remove <user>` - Removes a Discord user from the verified members list

#### Configuration Commands
These commands can only be run by administrators.

##### Channel Permissions
- `/allowed_channels list` - Lists all channels that can have their threads archived
- `/allowed_channels add <channel>` - Adds a channel to the allowed list
- `/allowed_channels remove <channel>` - Removes a channel from the allowed list

##### Role Permissions
- `/allowed_roles list` - Lists all roles that can archive channels
- `/allowed_roles add <role>` - Adds a role to the allowed list
- `/allowed_roles remove <role>` - Removes a role from the allowed list

##### Verification Roles
- `/verified_members role list` - Lists all roles that can be given to verified members
- `/verified_members role add <role>` - Adds a role to be given to verified members
- `/verified_members role remove <role>` - Removes a role from being given to verified members

### Setup Process

1. **Prerequisites**
   - Node.js installed
   - A Discord bot application created in the [Discord Developer Portal](https://discord.com/developers/applications)
   - Message Content Intent enabled in the Discord Developer Portal

2. **Installation**
   ```bash
   git clone https://github.com/engineereng/DiscordWikitextArchive.git
   cd DiscordWikitextArchive
   npm install
   ```

3. **Configuration**
   - Copy `.env.sample` to `.env`
   - Fill in the following environment variables:
     - `APP_ID`: Your Discord application ID
     - `DISCORD_TOKEN`: Your bot token
     - `PUBLIC_KEY`: Your application's public key
     - `GUILD_ID`: Your server's ID

4. **Initial Setup**
   - Run the bot using `npm run start`
   - Use the following commands to set up the initial configuration:
     - `/allowed_channels add <channel>` - Add channels where archiving is allowed
     - `/allowed_roles add <role>` - Add roles that can archive
     - `/verified_members role add <role>` - Add roles to be given to verified members

5. **Known Issues**
   - If the bot says "The application didn't respond in time," the host might be experiencing issues
   - Using bot commands in closed threads reopens them (remember to re-close)
   - The bot doesn't handle embeds - they need to be uploaded manually
   - Names in logs might not match wiki usernames if members aren't verified

6. **Security Notes**
   - Keep `verified_members.json` secure and never commit it to version control
   - Only administrators should have access to configuration commands
   - Verify members carefully to maintain wiki integrity