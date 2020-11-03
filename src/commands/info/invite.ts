import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import { PERMISSIONS } from '@inari/utils/constants';

export default class extends Command {
    constructor() {
        super('invite', {
            aliases: ['invite', 'join'],
            channel: 'guild',
            description: {
                content: 'Invite me to your server!',
            },
        });
    }

    async exec(message: Message) {
        const [repo, owner] = process.env.npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        const embed = this.client.embeds.info(
            `[Here](${await this.client.generateInvite(
                PERMISSIONS
            )}) is my invite link! You can also [self-host](https://github.com/${owner}/${repo}) me if you prefer.`
        );
        return message.channel.send({ embed });
    }
}
