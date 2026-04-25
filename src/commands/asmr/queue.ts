import { Client, Command } from '@structures';
import {
	ApplicationCommandType,
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	MessageComponentInteraction,
	SnowflakeUtil,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { AudioPlayerStatus } from '@discordjs/voice';

const ITEMS_PER_PAGE = 10;

export default class extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'queue',
			type: ApplicationCommandType.ChatInput,
			description: 'Shows the current queue',
			cooldown: 10000,
			nsfw: true,
			options: [
				{
					name: 'page',
					type: 4,
					description: 'Page number to view',
					required: false,
					min_value: 1,
				},
			],
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

		const queueLength = subscription.queue.length;
		const totalPages = Math.max(1, Math.ceil(queueLength / ITEMS_PER_PAGE));
		let page = (interaction.options.get('page')?.value as number | undefined) ?? 1;
		page = Math.max(1, Math.min(page, totalPages));

		const ns = SnowflakeUtil.generate().toString();
		const PREV = `${ns}-queue-prev`;
		const JUMP = `${ns}-queue-jump`;
		const NEXT = `${ns}-queue-next`;
		const TOGGLE = `${ns}-queue-toggle`;
		const SKIP = `${ns}-queue-skip`;
		const MODAL = `${ns}-queue-modal`;

		const payload = this.buildPayload(subscription, page, totalPages, PREV, JUMP, NEXT, TOGGLE, SKIP);
		const message = await interaction.editReply(payload);

		if (totalPages <= 1 && !subscription.isPlaying && !subscription.isPaused) return;

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i: MessageComponentInteraction) =>
				i.user.id === interaction.user.id &&
				[PREV, JUMP, NEXT, TOGGLE, SKIP].includes(i.customId),
			time: 300_000,
		});

		collector.on('collect', async (i: MessageComponentInteraction) => {
			if (i.customId === JUMP) {
				const modal = new ModalBuilder()
					.setCustomId(MODAL)
					.setTitle('Jump to Page');
				const input = new TextInputBuilder()
					.setCustomId('page')
					.setLabel(`Enter a page number (1–${totalPages})`)
					.setStyle(TextInputStyle.Short)
					.setRequired(true);
				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(input)
				);
				await i.showModal(modal);
				try {
					const submit = await i.awaitModalSubmit({
						filter: si =>
							si.user.id === interaction.user.id && si.customId === MODAL,
						time: 15_000,
					});
					await submit.deferUpdate();
					const val = parseInt(submit.fields.getTextInputValue('page'), 10);
					if (!isNaN(val) && val >= 1 && val <= totalPages) {
						page = val;
					}
					await submit.editReply(
						this.buildPayload(subscription, page, totalPages, PREV, JUMP, NEXT, TOGGLE, SKIP)
					);
				} catch {
					// Modal timed out or was dismissed — no-op
				}
				return;
			}

			if (!i.deferred && !i.replied) await i.deferUpdate();

			if (i.customId === PREV) page--;
			else if (i.customId === NEXT) page++;
			else if (i.customId === TOGGLE) {
				if (subscription.isPlaying) subscription.pause();
				else if (subscription.isPaused) subscription.unpause();
			}
			else if (i.customId === SKIP) {
				subscription.skip();
			}

			page = Math.max(1, Math.min(page, totalPages));
			await i.editReply(
				this.buildPayload(subscription, page, totalPages, PREV, JUMP, NEXT, TOGGLE, SKIP)
			);
		});
	}

	private buildPayload(
		subscription: import('../../structures/GuildAudioPlayer').GuildAudioPlayer,
		page: number,
		totalPages: number,
		PREV: string,
		JUMP: string,
		NEXT: string,
		TOGGLE: string,
		SKIP: string
	) {
		const resource = subscription.currentResource;
		if (!resource) {
			return {
				embeds: [
					this.client.embeds.default().setDescription("❌\u2000Nothing's playing in this server!"),
				],
			};
		}

		const { title, url, imageURL, circle, duration, requestedBy } = resource.metadata;
		const currentTime = resource.playbackDuration;
		const timeStr = this.client.util.formatDuration(currentTime / 1000);
		const totalMs = this.client.util.parseDurationString(duration) * 1000;
		const progressBar = this.client.util.createProgressBar(currentTime, totalMs);
		const stateEmoji = subscription.isPaused ? '⏸️' : '▶️';
		const queueLength = subscription.queue.length;

		let description = `[${title}](${url})\nby ${circle}`;
		if (requestedBy) {
			description += ` · Requested by <@${requestedBy.id}>`;
		}
		description += `\n${progressBar}\n\`[${timeStr} / ${duration}]\``;

		if (queueLength > 0) {
			const start = (page - 1) * ITEMS_PER_PAGE;
			const end = Math.min(start + ITEMS_PER_PAGE, queueLength);
			const pageTracks = subscription.queue.slice(start, end);

			const queueText = pageTracks
				.map((track: import('../../structures/Track').Track, index: number) => `${start + index + 1}. [${track.title}](${track.url})`)
				.join('\n');

			description += `\n\n__Up Next:__\n${queueText}`;
		}

		const embed = this.client.embeds
			.default()
			.setTitle(`${stateEmoji}\u2000Now Playing`)
			.setDescription(description)
			.setThumbnail(imageURL)
			.addFields([
				{ name: '⏱️ Duration', value: `\`${duration}\``, inline: true },
				{ name: '🔊 Volume', value: `\`${Math.round(subscription.volume * 100)}%\``, inline: true },
				{ name: '📋 Queue', value: `\`${queueLength} track${queueLength === 1 ? '' : 's'}\``, inline: true },
			])
			.setFooter({
				text:
					totalPages > 1
						? `Page ${page}/${totalPages} · ${queueLength} track${queueLength === 1 ? '' : 's'} queued`
						: `${queueLength} track${queueLength === 1 ? '' : 's'} queued`,
			});

		const rows: ActionRowBuilder<ButtonBuilder>[] = [];

		if (totalPages > 1) {
			const prev = new ButtonBuilder()
				.setCustomId(PREV)
				.setEmoji({ name: '⬅️' })
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page <= 1);

			const jump = new ButtonBuilder()
				.setCustomId(JUMP)
				.setLabel(`${page}/${totalPages}`)
				.setStyle(ButtonStyle.Secondary);

			const next = new ButtonBuilder()
				.setCustomId(NEXT)
				.setEmoji({ name: '➡️' })
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page >= totalPages);

			rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prev, jump, next));
		}

		const toggle = new ButtonBuilder()
			.setCustomId(TOGGLE)
			.setEmoji({ name: subscription.isPaused ? '▶️' : '⏸️' })
			.setStyle(ButtonStyle.Primary);

		const skip = new ButtonBuilder()
			.setCustomId(SKIP)
			.setEmoji({ name: '⏭️' })
			.setStyle(ButtonStyle.Primary)
			.setDisabled(!subscription.isPlaying && !subscription.isPaused);

		rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(toggle, skip));

		return { embeds: [embed], components: rows };
	}
}
