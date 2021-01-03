import { Command } from '@structures/Command';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('donate', {
            aliases: ['donate', 'support'],
            channel: 'guild',
            description: {
                content: 'Show support to the bot creator!',
            },
        });
    }

    async exec(message: Message) {
        const donate = this.client.config.settings.donateLink;
        if (!donate) return;
        const embed = this.client.embeds.info(
            `If you really like me and want to support my creator, you can consider donating to my creator's [Paypal](${donate}). Do note that donating will not grant you any kinds of perks in return. Please do not donate if you're financially struggling.`
        );
        return message.channel.send({ embed });
    }
}
