import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';
import { AudioPlayerStatus } from '@discordjs/voice';

export default class extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'nowplaying',
			type: ApplicationCommandType.ChatInput,
			description: 'Shows the current playing track',
			cooldown: 10000,
			nsfw: true,
		});
	}

	async exec(interaction: CommandInteraction) {
		const subscription = this.client.subscriptions.get(interaction.guildId);
		if (!subscription) {
			return interaction.editReply("❌\u2000Nothing's playing in this server!");
		}

		if (subscription.audioPlayer.state.status === AudioPlayerStatus.Idle) {
			return interaction.editReply("❌\u2000Nothing's playing in this server!");
		}

		const resource = subscription.currentResource;
		if (!resource) {
			return interaction.editReply("❌\u2000Nothing's playing in this server!");
		}

		const { title, url, imageURL, circle, duration, tracks, requestedBy } = resource.metadata;
		const currentTime = resource.playbackDuration;
		const timeStr = this.client.util.formatDuration(currentTime / 1000);
		const totalMs = this.client.util.parseDurationString(duration) * 1000;
		const progressBar = this.client.util.createProgressBar(currentTime, totalMs);
		const stateEmoji = subscription.isPaused ? '⏸️' : '▶️';

		let description = `[${title}](${url})\nby ${circle}`;
		if (requestedBy) {
			description += ` · Requested by <@${requestedBy.id}>`;
		}
		description += `\n${progressBar}\n\`[${timeStr} / ${duration}]\``;

		const embed = this.client.embeds
			.default()
			.setTitle(`${stateEmoji}\u2000Now Playing`)
			.setDescription(description)
			.setThumbnail(imageURL)
			.addFields([
				{ name: '⏱️ Duration', value: `\`${duration}\``, inline: true },
				{ name: '🔊 Volume', value: `\`${Math.round(subscription.volume * 100)}%\``, inline: true },
				{ name: '📋 Queue', value: `\`${subscription.queue.length} track${subscription.queue.length === 1 ? '' : 's'}\``, inline: true },
			]);

		if (tracks.length > 0) {
			const { index, offset } = resource.metadata.getChapterAt(currentTime);
			const trackList = tracks
				.map((t, i) => {
					const marker = i === index ? '▶' : ' ';
					const trackTime = this.client.util.formatDuration(t.length);
					return `${marker} \`${(i + 1).toString().padStart(2, '0')}\` ${t.title} (\`${trackTime}\`)`;
				})
				.join('\n');
			const currentTrack = tracks[index];
			const currentOffsetStr = this.client.util.formatDuration(offset);
			const currentTrackLengthStr = this.client.util.formatDuration(currentTrack.length);
			embed.addFields([
				{
					name: `Current Track — ${currentTrack.title} (\`${currentOffsetStr} / ${currentTrackLengthStr}\`)`,
					value: trackList.substring(0, 1024),
				},
			]);
		}

		return interaction.editReply({ embeds: [embed] });
	}
}
