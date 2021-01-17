import { Command } from '@structures';
import { Message } from 'discord.js';

const REQUIRED_PERMISSIONS = ['MANAGE_GUILD'] as const;

export default class extends Command {
    constructor() {
        super('url', {
            aliases: ['url', 'toggle-url'],
            userPermissions: REQUIRED_PERMISSIONS,
            description: {
                content: 'Toggles url mode (allows calling g, tag, etc. with urls)',
                examples: [
                    '\nTry pasting a link from nhentai.net (not image link) and see what happens when url mode is on.',
                ],
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
