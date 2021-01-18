import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('support', {
            aliases: ['support', 'support-server'],
            description: {
                content: 'Join the support server!',
                examples: [
                    '\nIf you encounter an unexpected result, please report it to the admin/mods in the support server.',
                ],
            },
        });
    }

    async exec(message: Message) {
        return message.channel.send(
            this.client.embeds
                .default()
                .setDescription(`[Join](https://discord.gg/8PX6QZb) the support server!`)
        );
    }
}
