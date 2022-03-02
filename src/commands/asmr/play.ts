import { Client, Command, MusicSubscription, Track } from '@structures';
import { CommandInteraction, GuildMember } from 'discord.js';
import {
    DiscordGatewayAdapterCreator,
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus,
} from '@discordjs/voice';

const TAGS = [
    'ALL AGES',
    'R18',
    'R15',
    'Whisper',
    'Ear Licking',
    'Ear Cleaning',
    'Sleeping',
    'Older Sister',
    'Girlfriend',
    'ASMR',
    'Binaural',
    'Fellatio',
    'Footjob',
    'Loli',
    'Maid',
    'Masturbation',
    'Milf',
    'NTR',
    'Reverse Rape',
    'Succubus',
    'Tsundere',
    'Virgin',
    'Yandere',
    'Yuri',
];

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'play',
            type: 'CHAT_INPUT',
            description: 'Plays a random ASMR file with specified tag',
            cooldown: 10000,
            nsfw: true,
            options: [
                {
                    name: 'tag',
                    type: 'STRING',
                    description: 'The tag to play',
                    required: true,
                    choices: TAGS.map(t => {
                        return {
                            name: t,
                            value: t,
                        };
                    }),
                },
            ],
        });
    }

    async exec(interaction: CommandInteraction) {
        const tag = interaction.options.get('tag').value as string;
        let subscription = this.client.subscriptions.get(interaction.guildId);
        if (!subscription) {
            if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
                const channel = interaction.member.voice.channel;
                subscription = new MusicSubscription(
                    joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild
                            .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
                    })
                );
                subscription.voiceConnection.on('error', error => this.client.logger.error(error));
                this.client.subscriptions.set(interaction.guildId, subscription);
            }
        }

        if (!subscription) {
            throw new Error('No voice channel found.');
        }

        try {
            await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
        } catch (error) {
            this.client.logger.error(error);
            throw new Error(
                'Failed to join voice channel within 20 seconds, please try again later!'
            );
        }

        const { circle = null, title, url, image } = await this.client.jasmr.tag(tag);
        if (!title || !url || !image) {
            throw new Error(`No result found: ${tag}`);
        }
        const video = await this.client.jasmr.video(encodeURI(url));
        if (!video) {
            throw new Error(`No result found: ${tag}`);
        }
        const np = this.client.embeds
            .default()
            .setTitle('▶️\u2000Now Playing')
            .setDescription(`[${title}](${url})`)
            .setThumbnail(image)
            .setFooter(`Circle: ${circle ?? 'N/A'}`);
        const fp = this.client.embeds
            .default()
            .setTitle('⏹️\u2000Finished Playing')
            .setDescription(`[${title}](${url})`)
            .setThumbnail(image)
            .setFooter(`Circle: ${circle}`);
        try {
            const track = await Track.from(encodeURI(url), encodeURI(video), image, title, circle, {
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
            });
            subscription.enqueue(track);
            await interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setDescription(
                            `Queued [${track.title}](${url})\nIt may take a while to fetch the audio resources`
                        ),
                ],
            });
        } catch (error) {
            this.client.logger.error(error);
            throw new Error('Failed to play track, please try again later!');
        }
    }
}
