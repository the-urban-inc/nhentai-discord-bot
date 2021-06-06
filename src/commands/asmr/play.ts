import { Command } from '@structures';
import { Message } from 'discord.js';
import { Readable } from 'stream';
import fs from 'fs';
const fsp = fs.promises;
import path from 'path';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';

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

// this doesn't work
async function getDuration(input: string) {
    return new Promise(async (resolve, reject) => {
        const buff = Buffer.alloc(100);
        const header = Buffer.from('mvhd');
        const response = await axios.get(input, {
            responseType: 'stream',
        });
        const fn = path.join(__dirname, path.basename(input));
        const w = response.data.pipe(fs.createWriteStream(fn));
        w.on('finish', async () => {
            const file = await fsp.open(fn, 'r');
            const { buffer } = await file.read(buff, 0, 100, 0);
            await fsp.unlink(fn);
            const start = buffer.indexOf(header) + 17;
            const duration = buffer.readUInt32BE(start + 4);
            resolve(duration);
        });
    });
}

async function extractAudio(input: string) {
    const cmd = await ffmpeg(input).audioChannels('1').format('mp3');
    return cmd.stream() as Readable;
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
            const voiceChannel = message.member.voice.channel;
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
            const dispatcher = connection.play(mp3Stream);
            message.channel.send(
                this.client.embeds
                    .default()
                    .setAuthor('▶️\u2000Now Playing')
                    .setDescription(`[${title}](${url})`)
                    .setFooter('ASMR file from jasmr.net')
            );
            const duration = await getDuration(video) as number;
            console.log(duration);
            this.client.current.set(message.guild.id, {
                title,
                url,
                duration,
            });
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
            }
            return this.client.logger.error(err.message);
        }
    }
}
