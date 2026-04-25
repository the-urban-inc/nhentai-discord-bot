import { Client, Command, GuildAudioPlayer, UserError, createGuildAudioPlayer } from '@structures';
import { ApplicationCommandType, CommandInteraction, GuildMember, GuildTextBasedChannel } from 'discord.js';
import { entersState, VoiceConnectionStatus } from '@discordjs/voice';

export default class extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'join',
			type: ApplicationCommandType.ChatInput,
			description: 'Joins voice channel',
			cooldown: 10000,
			nsfw: true,
		});
	}

	async exec(interaction: CommandInteraction) {
		await interaction.editReply('Attempting to join voice channel ...');
		let subscription = this.client.subscriptions.get(interaction.guildId);
		if (
			!subscription ||
			subscription.voiceConnection.state.status === VoiceConnectionStatus.Disconnected ||
			subscription.voiceConnection.state.status === VoiceConnectionStatus.Destroyed
		) {
			if (subscription) {
				subscription.destroy();
			}
			if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
				const channel = interaction.member.voice.channel;
				subscription = createGuildAudioPlayer(channel, interaction.channel as GuildTextBasedChannel);
				subscription.voiceConnection.on('error', error => this.client.logger.error(error));
				subscription.once('disconnect', () => {
					this.client.subscriptions.delete(interaction.guildId);
				});
				this.client.subscriptions.set(interaction.guildId, subscription);
			}
		}

		if (!subscription) {
			throw new UserError('FAILED_TO_JOIN_VC');
		}

		try {
			await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
			await interaction.editReply('✅\u2000Successfully joined voice channel!');
		} catch (error) {
			this.client.logger.error(error);
			throw new UserError('FAILED_TO_JOIN_VC');
		}
	}
}
