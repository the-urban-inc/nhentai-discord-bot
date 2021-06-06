import { Command } from '@structures';
import { Message } from 'discord.js';
import { PassThrough } from 'stream';
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

function getDuration(input: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg(input).ffprobe((err, data) => {
            resolve(data?.format?.duration ?? -1);
        });
    });
}

async function extractAudio(input: string) {
    const cmd = ffmpeg(input).audioChannels(1).format('mp3');
    return cmd.pipe() as PassThrough;
}

export default class extends Command {
    constructor() {
        super('play', {
            aliases: ['play', 'asmr'],
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
            const { title, url } = await this.client.jasmr.tag(tagID);
            if (!title || !url) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const video = await this.client.jasmr.video(url);
            if (!video) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const mp3Stream = await extractAudio(video);
            let connection = message.guild.voice?.connection;
            if (!connection) {
                connection = await voiceChannel.join();
                message.channel.send(
                    this.client.embeds
                        .default()
                        .setDescription(`✅\u2000Joined channel \`${voiceChannel.name}\``)
                );
            }
            const msg = await message.channel.send(
                this.client.embeds.default().setDescription('🔎\u2000Searching for ASMR file ...')
            );
            const duration = (await getDuration(video)) * 1000;
            if (duration < 0 || isNaN(duration)) throw new Error('Fetching metadata failed.');
            this.client.current.set(message.guild.id, {
                title,
                url,
                duration,
            });
            const dispatcher = connection.play(mp3Stream);
            if (msg.editable) {
                await msg.edit(
                    this.client.embeds
                        .default()
                        .setAuthor('▶️\u2000Now Playing')
                        .setDescription(`[${title}](${url})`)
                        .setFooter('ASMR file from jasmr.net')
                );
            } else {
                await message.channel.send(
                    this.client.embeds
                        .default()
                        .setAuthor('▶️\u2000Now Playing')
                        .setDescription(`[${title}](${url})`)
                        .setFooter('ASMR file from jasmr.net')
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
        } catch (err) {
            if (err.message === 'Connection not established within 15 seconds.') {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setColor('#ff0000')
                        .setDescription('An unexpected error has occurred while connecting')
                );
            } else if (err.message === 'Fetching metadata failed.') {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setColor('#ff0000')
                        .setDescription('An unexpected error has occurred while fetching metadata')
                );
            }
            return this.client.logger.error(err.message);
        }
    }
}
