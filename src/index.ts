import { config } from 'dotenv';
config();
import { createServer } from 'http';
createServer().listen(process.env.PORT || 8080);
import { Client } from './structures/Client';
const client = new Client();
client.start();

client.once('ready', async () => {
    if (!client.application?.owner) await client.application?.fetch();
    const owner = client.application.owner.id;
    client.ownerID = owner;
    client.logger.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`);
    client.logger.info(`[READY] Logged in as ${client.user.tag}! ID: ${client.user.id}.`);
    await client.commandHandler.loadCommands();
});

client.on('guildCreate', async guild => {
    client.logger.discord = true;
    client.logger.info(
        `Joined guild "${guild.name}" (ID: ${guild.id}) (Total: ${client.guilds.cache.size} guilds)`
    );
    client.logger.discord = false;
});

client.on('error', err => client.logger.error(err));
client.on('disconnect', () => client.logger.warn('[EVENT] Disconnecting...'));
process.on('uncaughtException', err => client.logger.stackTrace(err));
process.on('unhandledRejection', err => client.logger.stackTrace(err));
