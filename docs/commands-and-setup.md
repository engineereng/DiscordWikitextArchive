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

### Deployment
#### Development (using Ngrok)
For development, you may want to use Ngrok to test the app:
1. **Install Ngrok**
   ```bash
   npm install -g ngrok
   ```

2. **Start Ngrok**
   ```bash
   ngrok http 3000
   ```

3. **Configure Discord**
   - Copy the HTTPS URL from ngrok (e.g., `https://xxxx.ngrok.io`)
   - In Discord Developer Portal, set Interactions Endpoint URL to:
     `https://xxxx.ngrok.io/interactions`

4. **Start the Bot**
   ```bash
   npm run start
   ```

   Note: I suggest using a utility that automatically restarts the app after you make changes, such as [nodemon](https://www.npmjs.com/package/nodemon).

5. **Testing**
   - The bot will be accessible through the ngrok URL
   - Ngrok handles SSL/TLS automatically
   - Keep ngrok running while testing

#### Raspberry Pi
A relatively lightweight Discord bot like this can be deployed to a Raspberry Pi for relatively cheap.
1. **Initial Setup**
   - Install Node.js on Raspberry Pi
   - Clone the repository
   - Install dependencies with `npm install`

2. **Static IP Configuration**
   - Set up static IP for Raspberry Pi:
     ```bash
     sudo nano /etc/dhcpcd.conf
     ```
   - Add at bottom:
     ```
     interface wlan0
     static ip_address=YOUR_IP_ADDRESS
     static routers=YOUR_ROUTER_IP
     static domain_name_servers=8.8.8.8 8.8.4.4 # Google's DNS; can also use alternate ones
     ```

3. **Port Forwarding**
   - In router settings:
     - External Port: 443
     - Internal Port: 3000
     - Internal IP: [Raspberry Pi's static IP]
     - Protocol: TCP

4. **Domain and SSL**
   - Register domain (e.g., through Cloudflare)
   - Set up DNS A record pointing to your public IP
   - Enable Cloudflare proxy (orange cloud)
   - Set SSL/TLS encryption mode to "Full"

5. **HTTPS Configuration**
   To enable your app to communicate with CloudFlare, you will need to generate self-signed certificates. We didn't have to do this while using Ngrok, since it handled everything for us.
   - Generate self-signed certificates:
     ```bash
     mkdir -p /home/pi/certs
     cd /home/pi/certs
     openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out certificate.pem
      ```
   - Update app.js to use HTTPS: Replace the "app.listen" function at the bottom with:

   ```javascript
   const httpsOptions = {
      key: fs.readFileSync('/home/collineng/certs/private.key'),
      cert: fs.readFileSync('/home/collineng/certs/certificate.pem')
   };

   https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log('Listening on port', PORT, '(HTTPS)');
   });
   ```
   ...and import fs and https. Adjust the certificate paths according to your file system.

6. **PM2 Setup**
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "discord-bot" -- start
   pm2 startup
   pm2 save
   ```

7. **Log Rotation**
Set up [log rotation](https://en.wikipedia.org/wiki/Log_rotation) so log files are managed properly.
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 1M
   pm2 set pm2-logrotate:retain 3
   pm2 set pm2-logrotate:compress true
   pm2 set pm2-logrotate:rotateInterval '0 0 * * 0'
   ```

8. **Discord Configuration**
   - Set Interactions Endpoint URL to:
     `https://yourdomain.ext/interactions`

9. **Testing**
   - Verify bot starts automatically on reboot
   - Test slash commands in Discord
   - Monitor logs with `pm2 logs discord-bot`

### Security and Protection

1. **Rate Limiting and Abuse Prevention**
   - Currently not implemented
   - Consider implementing rate limiting for commands
   - Add cooldowns for archive operations
   - Monitor for unusual activity patterns

2. **Data Protection**
   - `verified_members.json` contains sensitive user data
   - Keep this file secure and never commit it to version control
   - Use the template file (`verified_members.template.json`) as a starting point
   - Store the actual file in a secure location outside the repository

3. **SSL/TLS Security**
   - Self-signed certificates are used for HTTPS
   - Cloudflare provides additional security layer
   - Regularly rotate certificates (recommended every 90 days)
   - Monitor for SSL/TLS vulnerabilities

### Error Handling and Recovery

1. **Connection Issues**
   - If the bot loses connection to Discord:
     - PM2 will attempt to restart the bot automatically
     - Check logs for connection errors: `pm2 logs discord-bot`
     - Verify internet connectivity on the Raspberry Pi
     - Check Discord API status at [status.discord.com](https://status.discord.com)

2. **Common Error Scenarios**
   - "Application didn't respond in time" - Check server resources and response times
   - SSL/TLS errors - Verify certificate validity and Cloudflare settings
   - Permission errors - Verify bot has correct Discord permissions
   - Database errors - Check file permissions and disk space

### Backup and Recovery

1. **Regular Backups**
   - Back up the following files regularly:
     - `verified_members.json`
     - `verified_members_roles.json`
     - `.env` file
     - Any custom configurations
   - Store backups in a secure location
   - Consider automated backup solutions

2. **Recovery Procedures**
   - To restore from backup:
     1. Stop the bot: `pm2 stop discord-bot`
     2. Restore backup files
     3. Verify file permissions
     4. Restart the bot: `pm2 start discord-bot`
   - Test recovery procedures periodically

3. **Migration to New Server**
   - Document all configuration steps
   - Transfer all necessary files
   - Update DNS records if needed
   - Verify SSL certificates
   - Test all functionality

### Monitoring and Maintenance

1. **System Monitoring**
   - Monitor system resources:
     ```bash
     pm2 monit
     ```
   - Check disk space:
     ```bash
     df -h
     ```
   - Monitor memory usage:
     ```bash
     free -m
     ```

2. **Bot Health Checks**
   - Set up automated health checks
   - Monitor response times
   - Track error rates
   - Set up alerts for critical issues

3. **Log Management**
   - Review logs regularly:
     ```bash
     pm2 logs discord-bot
     ```
   - Check for unusual patterns
   - Archive old logs
   - Monitor log rotation

### Updates and Maintenance

1. **Regular Updates**
   - Update Node.js and npm packages:
     ```bash
     npm update
     ```
   - Check for security vulnerabilities:
     ```bash
     npm audit
     ```
   - Update PM2:
     ```bash
     npm install -g pm2@latest
     ```

2. **Security Patches**
   - Monitor for security advisories
   - Apply patches promptly
   - Test updates in development environment
   - Document all changes

3. **Version Control**
   - Keep the repository up to date
   - Document all changes in commit messages
   - Test updates before deploying
   - Maintain a changelog

4. **Scheduled Maintenance**
   - Plan maintenance windows
   - Notify users in advance
   - Document maintenance procedures
   - Verify functionality after maintenance