const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

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

	async exec(message) {
		const [repo, owner] = process.env.npm_package_repository_url.split('/').filter(a => a).reverse()
		const embed = new MessageEmbed().setDescription(`[Here](${
			await this.client.generateInvite([
				'MANAGE_MESSAGES', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY', 'USE_EXTERNAL_EMOJIS'
			])
		}) is my invite link! You can also [self-host](https://github.com/${owner}/${repo}) me if you prefer.`)
		return message.channel.send({ embed });
	}
};