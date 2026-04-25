import {
	Client,
	Command,
	Track,
	UserError,
	createGuildAudioPlayer,
} from '@structures';
import { ApplicationCommandType, ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, GuildMember, GuildTextBasedChannel, VoiceChannel } from 'discord.js';
import { entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { Sort } from '@api/jasmr';
import Fuse from 'fuse.js';

const AGE_RATING_CHOICES = [
	{ name: 'All', value: 'all' },
	{ name: 'R18', value: 'r18' },
	{ name: 'R15', value: 'r15' },
	{ name: 'General', value: 'general' },
];

const DATE_CHOICES = [
	{ name: 'All time', value: 'alltime' },
	{ name: 'Today', value: 'today' },
	{ name: 'This week', value: 'week' },
	{ name: 'This month', value: 'month' },
	{ name: 'This year', value: 'year' },
];

export default class extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'play',
			type: ApplicationCommandType.ChatInput,
			description: 'Plays a random ASMR file with specified query',
			cooldown: 10000,
			nsfw: true,
			options: [
				{
					name: 'query',
					type: ApplicationCommandOptionType.String,
					description: 'The query to search for',
					autocomplete: true,
					required: true,
				},
				{
					name: 'page',
					type: ApplicationCommandOptionType.Integer,
					description: 'Page number (default: 1)',
				},
				{
					name: 'sort',
					type: ApplicationCommandOptionType.String,
					description: 'ASMR sort method (default: relevance)',
					choices: Object.keys(Sort).map(k => {
						return {
							name: k.match(/[A-Z][a-z]+|[0-9]+/g).join(' '),
							value: Sort[k],
						};
					}),
				},
				{
					name: 'age_rating',
					type: ApplicationCommandOptionType.String,
					description: 'Age rating filter (default: all)',
					choices: AGE_RATING_CHOICES,
				},
				{
					name: 'date',
					type: ApplicationCommandOptionType.String,
					description: 'Upload date filter (default: all time)',
					choices: DATE_CHOICES,
				},
				{
					name: 'duration_min',
					type: ApplicationCommandOptionType.Integer,
					description: 'Minimum duration in minutes',
				},
				{
					name: 'duration_max',
					type: ApplicationCommandOptionType.Integer,
					description: 'Maximum duration in minutes',
				},
			],
		});
	}

	async autocomplete(interaction: AutocompleteInteraction) {
		await interaction.respond(
			new Fuse(this.client.asmrTags, {
				includeScore: true,
				threshold: 0.1,
			}).search(interaction.options.getFocused(), { limit: 25 }).map(f => {
				return {
					name: f.item,
					value: f.item,
				};
			})
		);
	}

	async exec(interaction: CommandInteraction) {
		const query = interaction.options.get('query').value as string;
		const page = (interaction.options.get('page')?.value as number) ?? 1;
		const sort = (interaction.options.get('sort')?.value as string) ?? 'relevance';
		const ageRating = (interaction.options.get('age_rating')?.value as string) ?? 'all';
		const date = (interaction.options.get('date')?.value as string) ?? 'alltime';
		const durationMin = (interaction.options.get('duration_min')?.value as number | undefined);
		const durationMax = (interaction.options.get('duration_max')?.value as number | undefined);

		const filters = {
			ageRating: ageRating as 'all' | 'r18' | 'r15' | 'general',
			date: date as 'alltime' | 'today' | 'week' | 'month' | 'year',
			durationMin: durationMin !== undefined ? durationMin * 60 : undefined,
			durationMax: durationMax !== undefined ? durationMax * 60 : undefined,
		};

		const { results, totalCount } = await this.client.jasmr.search(query.toLowerCase(), page, sort, filters);
		if (!results || !results.length) {
			throw new UserError('NO_RESULT', query);
		}
		const filtered = results.filter(result => result.title && result.url && result.image);
		const resultSelection = this.client.embeds.displayASMRList(filtered, totalCount);
		await resultSelection.run(interaction, `> **Searching for** **\`${query}\`** — ${totalCount} results`);
		const choice = await resultSelection.selection;
		if (choice == null) return interaction.editReply('No choice selected.');

		const result = filtered[choice];
		const { circle, title, url, tags, image, duration } = result;

		await interaction.editReply({
			content: 'Attempting to join voice channel ...',
			embeds: [],
			components: [],
		});
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
				if (!(channel as VoiceChannel).nsfw && result.rating === 'r18')
					throw new UserError('NSFW_VOICE_CHANNEL');
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
		}
		catch (error) {
			this.client.logger.error(error);
			throw new UserError('FAILED_TO_JOIN_VC');
		}

		const details = await this.client.jasmr.details(url);
		const videoURL = details.source;

		this.client.setupASMRPlayer(subscription);

		try {
			const track = Track.from(
				encodeURI(url),
				encodeURI(videoURL),
				image,
				title,
				circle,
				duration,
				tags,
				details.tracks,
				{ id: interaction.user.id, username: interaction.user.username }
			);
			subscription.enqueue(track);
			await interaction.editReply({
				content: null,
				embeds: [
					this.client.embeds
						.default()
						.setDescription(
							`Queued [${track.title}](${url})\nIt may take a while to fetch the audio resources`
						),
				],
				components: [],
			});
		}
		catch (error) {
			this.client.logger.error(error);
			throw new UserError('FAILED_TO_PLAY_TRACK');
		}
	}
}
