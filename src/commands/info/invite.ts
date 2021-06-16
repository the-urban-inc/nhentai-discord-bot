import { Command } from '@structures';
import { Message } from 'discord.js';
import { PERMISSIONS } from '@utils/constants';

export default class extends Command {
    constructor() {
        super('invite', {
            aliases: ['invite', 'join'],
            description: {
                content: 'Shows invite link.',
                examples: ['\nInvite me to your server!'],
            },
        });
    }

    async exec(message: Message) {
        const embed = this.client.embeds.default().setDescription(
            `[Here](${await this.client.generateInvite({
                permissions: PERMISSIONS,
            })}) is my invite link!`
        );
        return message.channel.send({ embed });
    }
}
