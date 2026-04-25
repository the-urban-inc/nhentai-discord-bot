import { Client, Command } from '@structures';
import { ApplicationCommandType, ApplicationCommandOptionType, CommandInteraction } from 'discord.js';

export default class extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'volume',
			type: ApplicationCommandType.ChatInput,
			description: 'Adjusts the playback volume',
			cooldown: 5000,
			nsfw: true,
			options: [
				{
					name: 'level',
					type: ApplicationCommandOptionType.Integer,
					description: 'Volume level from 0 to 200 (default: 100)',
					min_value: 0,
					max_value: 200,
				},
			],
		});
	}

	async exec(interaction: CommandInteraction) {
		const subscription = this.client.subscriptions.get(interaction.guildId);
		if (!subscription) {
			return interaction.editReply("❌\u2000Nothing's playing in this server!");
		}

		const level = interaction.options.get('level')?.value as number | undefined;

		if (level == null) {
			const current = Math.round(subscription.volume * 100);
			return interaction.editReply(`🔊\u2000Current volume: **${current}%**`);
		}

		subscription.setVolume(level / 100);
		return interaction.editReply(`🔊\u2000Volume set to **${level}%**`);
	}
}
