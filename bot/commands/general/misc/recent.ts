import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import moment from 'moment';
import { IServer, Server } from '@nhentai/models/server';
import { Logger } from '@nhentai/utils/logger';
import { Embeds } from '@nhentai/utils/embeds';

module.exports = class RecentCommand extends Command {
	constructor() {
		super('recent', {
            category: 'general',
			aliases: ['recent'],
			description: {
                content: 'Stalking people\'s fetishes.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
		});
    }

	async exec(message: Message) {
        await Server.findOne({
            serverID: message.guild.id
        }, async (err: Error, server: IServer) => {
            if (err) Logger.error(err);
            if (!server) return message.channel.send(Embeds.info('There are no recent calls in this server.'));
            else {
                if (!server.recent.length) return message.channel.send(Embeds.info('There are no recent calls in this server.'));
                let recent = server.recent; recent.reverse(); recent = recent.slice(0, 5);
                return message.channel.send(Embeds.info(recent.map((x) => `${x.author} : **\`${x.id}\`** \`${x.title}\` (${moment(x.date).fromNow()})`).join('\n')));
            }
        });
	}
};