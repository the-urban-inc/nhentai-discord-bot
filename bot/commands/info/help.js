const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { PREFIX } = process.env;

module.exports = class HelpCommand extends Command {
	constructor() {
		super('help', {
			aliases: ['help', 'halp', 'h'],
			category: 'info',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Displays a list of commands or information about a command.',
				usage: '[command]',
				examples: ['', 'osu', 'baka']
			},
			args: [{
				id: 'command',
				type: 'commandAlias',
				prompt: {
					start: 'Which command do you need help with?',
					retry: 'Please provide a valid command.',
					optional: true
				}
			}],
			cooldown: 3000
		});
	}

	exec(message, { command }) {
		if (!command) return this.execCommandList(message);
		const description = Object.assign({
			content: 'No description available.',
			usage: '',
			examples: [],
			fields: []
		}, command.description);
		const embed = new MessageEmbed()
			.setTitle(`\`${command.prefix || PREFIX}${command.aliases[0]} ${description.usage}\``)
            .addField('Description', description.content)
            .addField('Category', command.category);
		for (const field of description.fields) embed.addField(field.name, field.value);
		if (description.examples.length) {
			const text = `${command.prefix || PREFIX}${command.aliases[0]}`;
			embed.addField('Examples', `\`${text} ${description.examples.join(`\`\n\`${text} `)}\``);
		}
		if (command.aliases.length > 1) embed.addField('Aliases', `\`${command.aliases.join('` `')}\``);
		return message.channel.send({ embed });
	}

	async execCommandList(message) {
		const embed = new MessageEmbed()
			.setColor(0xFFAC33)
			.addField('Command List',
				[
					'This is a list of commands.',
					`To view details for a command, run \`${PREFIX}help <command>\`.`,
				])
		for (const category of this.handler.categories.values()) {
			if (message.author.id != this.client.ownerID) continue;
			const title = {
				general: 'General',
				images: 'Images',
				info: 'Info',
				owner: 'Owner',
			}[category.id];
			if (title) embed.addField(title, `\`${category.map(cmd => cmd.aliases[0]).join('` `')}\``);
		}
		embed.addField('Command Guide', 
		[
			'- <> : Required',
			'- [] : Optional',
			'- () : Choose 1'
		]);
		embed.addField('Emote Guide', 
		[
			'- ⏪ ⏩ : Jump to first/last page',
			'- ◀ ▶ : Jump to previous/next page',
			'- ↗️ : Jump to specified page',
			'- ℹ️ : Jump to info page',
			`- 🇦 ⏹ : Turn on/off auto browsing mode (add --auto to use this feature in ${PREFIX}g and ${PREFIX}random command)`,
			'- ❤️ : Add doujin to favourites',
			'- 🗑 : Delete bot message'
		]);
		return message.channel.send({ embed });
	}
};