import { Command } from '@structures';
import { Message } from 'discord.js';
import { PERMISSIONS } from '@utils/constants';

export default class extends Command {
    constructor() {
        super('invite', {
            aliases: ['invite', 'join'],
            description: {
                content: 'Shows invite link and GitHub link.',
                examples: ['\nInvite me to your server!'],
            },
        });
    }

    async exec(message: Message) {
        const [repo, owner] = process.env.npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        const embed = this.client.embeds.default().setDescription(
            `[Here](${await this.client.generateInvite({
                permissions: PERMISSIONS,
            })}) is my invite link! You can also [self-host](https://github.com/${owner}/${repo}) me if you prefer.`
        );
        return message.channel.send({ embed });
    }
}
