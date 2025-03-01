import {
    Client,
    Command,
    MusicSubscription,
    Track,
    UserError,
    createDiscordJSAdapter,
} from '@structures';
import { ApplicationCommandType, ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, GuildMember, VoiceChannel } from 'discord.js';
import { entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { Sort } from '@api/jasmr';
import Fuse from 'fuse.js';
import { application } from 'express';

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
        )
    }

    async exec(interaction: CommandInteraction) {
        const query = interaction.options.get('query').value as string;
        const page = (interaction.options.get('page')?.value as number) ?? 1;
        const sort = (interaction.options.get('sort')?.value as string) ?? 'relevance';

        let results = await this.client.jasmr.search(query.toLowerCase(), page, sort);
        if (!results || !results.length) {
            throw new UserError('NO_RESULT', query);
        }
        results = results.filter(result => result.title && result.url && result.image);
        const resultSelection = this.client.embeds.displayASMRList(results);
        await resultSelection.run(interaction, `> **Searching for** **\`${query}\`**`);
        const choice = await resultSelection.selection;
        if (choice == null) return interaction.editReply('No choice selected.');

        const result = results[choice];
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
            if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
                const channel = interaction.member.voice.channel;
                if (!(channel as VoiceChannel).nsfw && tags.map(t => t.trim()).includes('R18'))
                    throw new UserError('NSFW_VOICE_CHANNEL');
                subscription = new MusicSubscription(
                    joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: createDiscordJSAdapter(channel),
                    })
                );
                subscription.voiceConnection.on('error', error => this.client.logger.error(error));
                this.client.subscriptions.set(interaction.guildId, subscription);
            }
        }

        if (!subscription) {
            throw new UserError('FAILED_TO_JOIN_VC');
        }

        try {
            await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
        } catch (error) {
            this.client.logger.error(error);
            throw new UserError('FAILED_TO_JOIN_VC');
        }
        
        const videoURL = await this.client.jasmr.video(url);
    
        const np = this.client.embeds
            .default()
            .setTitle('▶️\u2000Now Playing')
            .setDescription(
                `[${title}](${url})\nDuration: \`${duration}\`\nTags: ${
                    tags.length ? tags.map(t => `\`${t.trim()}\``).join(' ') : 'N/A'
                }`
            )
            .setThumbnail(image)
            .setFooter({ text: `Circle: ${circle}` });
        const fp = this.client.embeds
            .default()
            .setTitle('⏹️\u2000Finished Playing')
            .setDescription(
                `[${title}](${url}))\nTags: ${
                    tags.length ? tags.map(t => `\`${t.trim()}\``).join(' ') : 'N/A'
                }`
            )
            .setThumbnail(image)
            .setFooter({ text: `Circle: ${circle}` });
        try {
            const track = await Track.from(
                encodeURI(url),
                encodeURI(videoURL),
                image,
                title,
                circle,
                duration,
                {
                    onStart() {
                        interaction.followUp({
                            embeds: [np],
                        });
                    },
                    onFinish() {
                        interaction.followUp({
                            embeds: [fp],
                        });
                    },
                    onError(error) {
                        throw error;
                    },
                }
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
        } catch (error) {
            this.client.logger.error(error);
            throw new UserError('FAILED_TO_PLAY_TRACK');
        }
    }
}
