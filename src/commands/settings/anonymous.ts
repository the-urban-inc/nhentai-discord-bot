import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('anonymous', {
            aliases: ['anonymous', 'incognito', 'hide', 'anon', 'toggle-anonymous', 'toggle-anon'],
            description: {
                content:
                    "Toggles anonymity. nhentai will not record your browsing history as well as your received EXP if it's on. It's turned on by default.",
                examples: ['\nFun fact: This is the command with the most aliases.'],
            },
        });
    }

    async exec(message: Message) {
        try {
            const anon = await this.client.db.User.anonymous(message.author);
            return message.channel.send(
                this.client.embeds.info(`Turned ${anon ? 'on' : 'off'} incognito mode.`)
            );
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
