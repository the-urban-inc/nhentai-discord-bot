import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('anonymous', {
            aliases: ['anonymous', 'incognito', 'hide', 'anon'],
            description: {
                content:
                    "Toggles anonymity. Nhentai will not record your browsing history as well as your received EXP if it's on. It's turned on by default.",
            },
        });
    }

    async exec(message: Message) {
        const anon = await this.client.db.User.anonymous(message.author);
        return message.channel.send(
            this.client.embeds.info(`Turned ${anon ? 'on' : 'off'} incognito mode.`)
        );
    }
}
