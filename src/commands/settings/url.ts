import { Command } from '@structures/Command';
import { Message } from 'discord.js';

const REQUIRED_PERMISSIONS = ['MANAGE_GUILD'] as const;

export default class extends Command {
    constructor() {
        super('url', {
            aliases: ['url', 'toggle-url'],
            channel: 'guild',
            userPermissions: REQUIRED_PERMISSIONS,
            description: {
                content: 'Toggles url mode (can call g, tag, etc. with urls)',
            },
        });
    }

    async exec(message: Message) {
        try {
            const url = await this.client.db.Server.url(message);
            return message.channel.send(
                this.client.embeds.info(`Turned ${url ? 'on' : 'off'} url mode for this server.`)
            );
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
