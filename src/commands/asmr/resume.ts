import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('resume', {
            aliases: ['resume'],
            cooldown: 30000,
            nsfw: true,
            description: {
                content: 'Resume current session.',
                examples: ['\nI\'m okay now!'],
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
            if (!connection.dispatcher.paused) {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setColor('#ff0000')
                        .setDescription("I'm not even paused to resume!")
                );
            }
            if (voiceChannel === connection.channel) {
                connection.dispatcher.resume();
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setDescription(`▶️\u2000Resumed`)
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
