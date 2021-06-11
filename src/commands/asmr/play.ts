import { Command } from '@structures';
import { Message } from 'discord.js';
import { PassThrough } from 'stream';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffprobe from 'ffprobe-static';
ffmpeg.setFfprobePath(ffprobe.path);

const TAGS = [
    'Pure',
    'R18',
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
    constructor() {
        super('play', {
            aliases: ['play', 'asmr'],
            cooldown: 300000,
            nsfw: true,
            description: {
                content: `Plays a random ASMR file with tag.\n\nTag list: ${TAGS.join(', ')}`,
                usage: '<tag>',
                examples: [' r18\nLewd ASMR.'],
            },
            error: {
                'Invalid Query': {
                    message: 'Please provide a valid tag!',
                    example: ` r18\nto play an ASMR file with tag \`r18\`.\nTag list: ${TAGS.map(
                        x => `\`${x}\``
                    ).join(', ')}`,
                },
                'No Voice Channel': {
                    message: 'No voice channel found!',
                    example: 'Please join a voice channel first.',
                },
                'Unable To Join': {
                    message: 'Unable to join or speak in voice channel!',
                    example: 'Please make sure I have the correct permissions.',
                },
                'In Use': {
                    message: 'I\'m currently in use!',
                    example: 'Join other members or wait for them to finish.',
                },
                'No Result': {
                    message: 'No gallery found!',
                    example: 'Try again with a different tag.',
                },
            },
            args: [
                {
                    id: 'tag',
                    type: 'string',
                    match: 'text',
                },
            ],
        });
    }

    async extractAudio(input: string, callback: Function) {
        const response = await axios.get(input, {
            responseType: 'stream',
        });
        const stream = new PassThrough();
        response.data.pipe(stream);
        return ffmpeg(stream)
            .on('codecData', data => {
                const [hr, mn, sc] = data.duration.split(':');
                callback((+sc + +mn * 60 + +hr * 3600) * 1000);
            })
            .on('error', err => {
                throw err;
            })
            .audioChannels(2)
            .format('mp3')
            .pipe() as PassThrough;
    }

    async exec(message: Message, { tag }: { tag: string }) {
        try {
            if (!TAGS.map(x => x.toLowerCase()).includes(tag)) {
                return this.client.commandHandler.emitError(
                    new Error('Invalid Query'),
                    message,
                    this
                );
            }
            const tagID = TAGS[TAGS.map(x => x.toLowerCase()).indexOf(tag)];
            const voiceChannel = message.member.voice?.channel;
            if (!voiceChannel) {
                return this.client.commandHandler.emitError(
                    new Error('No Voice Channel'),
                    message,
                    this
                );
            }
            if (!voiceChannel.joinable || !voiceChannel.speakable) {
                return this.client.commandHandler.emitError(
                    new Error('Unable To Join'),
                    message,
                    this
                );
            }
            let connection = message.guild.voice?.connection;
            if (connection && connection?.dispatcher) {
                return this.client.commandHandler.emitError(
                    new Error('In Use'),
                    message,
                    this
                );
            }
            const { title, url } = await this.client.jasmr.tag(tagID);
            if (!title || !url) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const video = await this.client.jasmr.video(encodeURI(url));
            if (!video) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }

            if (!connection || connection.channel !== voiceChannel) {
                connection = await voiceChannel.join();
                message.channel.send(
                    this.client.embeds
                        .default()
                        .setDescription(`✅\u2000Joined voice channel \`${voiceChannel.name}\``)
                );
            }
            const msg = await message.channel.send(
                this.client.embeds
                    .default()
                    .setDescription('🔎\u2000Searching for ASMR file ... This may take a while')
            );
            const stream = await this.extractAudio(encodeURI(video), async (duration: number) => {
                this.client.current.set(message.guild.id, {
                    title,
                    url,
                    duration,
                });
                const dispatcher = connection.play(stream);
                if (msg.editable) {
                    await msg.edit(
                        this.client.embeds
                            .default()
                            .setAuthor('▶️\u2000Now Playing')
                            .setDescription(
                                `[${title}](${url})\nDuration: ${this.client.util.formatMilliseconds(
                                    Math.floor(duration)
                                )}`
                            )
                            .setFooter(`Broadcasting in ${connection.channel.name}\u2000•\u2000ASMR file from jasmr.net`)
                    );
                } else {
                    await message.channel.send(
                        this.client.embeds
                            .default()
                            .setAuthor('▶️\u2000Now Playing')
                            .setDescription(
                                `[${title}](${url})\nDuration: ${this.client.util.formatMilliseconds(
                                    Math.floor(duration)
                                )}`
                            )
                            .setFooter(`Broadcasting in ${connection.channel.name}\u2000•\u2000ASMR file from jasmr.net`)
                    );
                }
                dispatcher.on('finish', () => {
                    connection.disconnect();
                    voiceChannel.leave();
                    message.channel.send(
                        this.client.embeds
                            .default()
                            .setDescription(
                                `📭\u2000Finished playing and disconnected from \`${voiceChannel.name}\``
                            )
                    );
                });
            });
        } catch (err) {
            if (err.message === 'read ECONNRESET') {
                message.channel.send(
                    this.client.embeds
                        .default()
                        .setColor('#ff0000')
                        .setDescription('An unexpected error has occurred while fetching video')
                );
            } else {
                message.channel.send(
                    this.client.embeds
                        .default()
                        .setColor('#ff0000')
                        .setDescription('An unexpected error has occurred while connecting')
                );
            }
            return this.client.logger.error(err);
        }
    }
}
