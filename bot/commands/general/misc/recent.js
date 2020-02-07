const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');
const Server = require('../../../models/server');

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

	async exec(message) {
        await Server.findOne({
            serverID: message.guild.id
        }, async (err, server) => {
            if (err) this.client.logger.error(err);
            if (!server) return message.channel.send(this.client.embeds('info', 'There are no recent calls in this server.'));
            else {
                if (!server.recent.length) return message.channel.send(this.client.embeds('info', 'There are no recent calls in this server.'));
                let recent = server.recent; recent.reverse();
                return message.channel.send(this.client.embeds('info', recent.map((x) => `${x.author} : **\`${x.id}\`** \`${x.title}\` (${moment(x.date).fromNow()})`).join('\n')));
            }
        });
	}
};