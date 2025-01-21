import { config } from 'dotenv';
config();
import { createServer } from 'http';
createServer().listen(process.env.PORT || 8080);
import { Collection, Snowflake, TextChannel } from 'discord.js';
const { LOGGING_CHANNEL } = process.env;
import axios from 'axios';
import { Client } from './structures/Client';
const client = new Client();
client.start();

let cur = 0;

async function getRandomCode() {
    return (
        String(
            await client.db.cache.random().catch(err => client.logger.error(err.message)) ?? '177013'
        ) 
    );
}

async function changePresence() {
    client.user.setPresence({
        activities: [
            [
                {
                    name: [
                        'Abandon all hope, ye who enter here',
                        'ここから入らんとする者は一切の希望を放棄せよ',
                    ][Math.round(Math.random())],
                },
            ],
            [{ name: await getRandomCode(), type: <const>'WATCHING' }],
            [
                {
                    name: 'your commands',
                    type: <const>'LISTENING',
                },
            ],
        ][cur],
    });
    cur = (cur + 1) % 3;
    let a = new Collection<string, string[]>();
    const tags = await client.db.cache
        .getDoujinTags()
        .catch(err => client.logger.error(err.message));
    if (tags) {
        for (const { name, type } of tags) {
            if (!a.has(type)) a.set(type, []);
            a.get(type)?.push(name);
        }
        client.tags = a;
    }
    setTimeout(changePresence, 300000);
}

client.once('ready', async () => {
    if (!client.application?.owner) await client.application?.fetch();
    const owner = client.application.owner.id;
    client.ownerID = owner;
    client.logger.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`);
    client.logger.info(`[READY] Logged in as ${client.user.tag}! ID: ${client.user.id}.`);
    await client.db.init();
    await client.commandHandler.loadCommands();
    await changePresence();
});

client.on('guildCreate', async guild => {
    client.logger.info(
        `Joined guild "${guild.name}" (ID: ${guild.id}) (Total: ${client.guilds.cache.size} guilds)`
    );
    const channel = await client.channels.fetch(LOGGING_CHANNEL as Snowflake);
    if (channel instanceof TextChannel) {
        channel.send({
            embeds: [
                client.embeds
                    .default()
                    .setDescription(
                        '```\n' +
                            `Joined guild "${guild.name}" (ID: ${guild.id}) (Total: ${client.guilds.cache.size} guilds)` +
                            '\n```'
                    )
                    .setTimestamp(),
            ],
        });
    }
});

client.on('error', err => {
    client.logger.error(err);
});
client.on('disconnect', () => client.logger.warn('[EVENT] Disconnecting...'));
process.on('uncaughtException', err => {
    client.logger.stackTrace(err);
});
process.on('unhandledRejection', err => {
    client.logger.stackTrace(err);
});
