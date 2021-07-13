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

client.on('error', err => client.logger.error(err));
process.on('uncaughtException', err => client.logger.stackTrace(err));
process.on('unhandledRejection', err => client.logger.stackTrace(err));
