import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('uptime', {
            aliases: ['uptime'],
            description: {
                content: "Check the bot's uptime.",
                examples: ["\nShows the nhentai's uptime."],
            },
        });
    }

    async exec(message: Message) {
        return message.channel.send(
            this.client.embeds
                .default()
                .setDescription(
                    `⏰ **Uptime**: ${
                        this.client.uptime
                            ? this.client.util.formatMilliseconds(this.client.uptime)
                            : 'N/A'
                    }`
                )
        );
    }
}
