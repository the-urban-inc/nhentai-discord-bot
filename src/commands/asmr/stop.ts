import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('stop', {
            aliases: ['stop', 'disconnect', 'dc'],
            nsfw: true,
            description: {
                content: `Stop the current session.`,
                usage: '',
                examples: ['\nStop! This is too much for me!'],
            },
            error: {
                'No Voice Channel': {
                    message: 'No voice channel found!',
                    example: "You're not in the same voice channel as me.",
                },
            },
        });
    }

    async exec(message: Message) {
        try {
            const voiceChannel = message.member.voice?.channel;
            if (!voiceChannel) {
                return this.client.commandHandler.emitError(
                    new Error('No Voice Channel'),
                    message,
                    this
                );
            }
            const connection = message.guild.voice?.connection;
            if (!connection || !connection.dispatcher) {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setColor('#ff0000')
                        .setDescription("I'm not even playing anything!")
                );
            }
            if (voiceChannel === connection.channel) {
                connection.disconnect();
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setDescription(`⏹️\u2000Stopped playing`)
                );
            }
            return this.client.commandHandler.emitError(
                new Error('No Voice Channel'),
                message,
                this
            );
        } catch (err) {
            return this.client.logger.error(err.message);
        }
    }
}
