import { Command, Listener } from '@structures';
import { Message } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('cooldown', {
            emitter: 'commandHandler',
            event: 'cooldown',
            category: 'commandHandler',
        });
    }

    exec(message: Message, command: Command, remaining: number) {
        if (command.isConditionalorRegexCommand) return;
        message.channel.send(`Please cooldown! **${Math.round(remaining / 1000)}** seconds left • **[** ${message.author.tag} **]**`)
    }
}
