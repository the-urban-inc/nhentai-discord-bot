const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { INVITE, NHENTAI_GITHUB_REPO_USERNAME, NHENTAI_GITHUB_REPO_NAME } = process.env;

module.exports = class InviteCommand extends Command {
	constructor() {
		super('invite', {
            category: 'info',
			aliases: ['invite', 'join'],
			description: {
                content: 'Invite me to your server!',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
		});
	}

	exec(message) {
		const embed = new MessageEmbed().setDescription(`[Here](${INVITE}) is my invite link! You can also [self-host](https://github.com/${NHENTAI_GITHUB_REPO_USERNAME}/${NHENTAI_GITHUB_REPO_NAME}) me if you prefer.`)
		return message.channel.send({ embed });
	}
};