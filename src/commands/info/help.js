const { Command } = require('discord-akairo');
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
		const embed = this.client.util.embed()
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
		const embed = this.client.util.embed()
			.setColor(0xFFAC33)
			.addField('Command List',
				[
					'This is a list of commands.',
					`To view details for a command, do \`${PREFIX}help <command>\`.`
				]);
		for (const category of this.handler.categories.values()) {
			const title = {
				general: 'General',
				info: 'Info',
				owner: 'Owner',
			}[category.id];
			if (title) embed.addField(title, `\`${category.map(cmd => cmd.aliases[0]).join('` `')}\``);
		}
		return message.channel.send({embed});
	}
};