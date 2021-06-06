import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('disconnect', {
            aliases: ['disconnect'],
            nsfw: true,
            description: {
                content: `Disconnect from current session.`,
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
            if (!connection) {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setColor('#ff0000')
                        .setDescription("I'm already disconnected!")
                );
            }
            if (voiceChannel === connection.channel) {
                connection.disconnect();
                voiceChannel.leave();
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setDescription(`📭\u2000Disconnected from \`${voiceChannel.name}\``)
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
