import Command from '@inari/struct/bot/Command';
import Listener from '@inari/struct/bot/Listener';
import { Message } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('commandStarted', {
            emitter: 'commandHandler',
            event: 'commandStarted',
            category: 'commandHandler',
        });
    }

    exec(message: Message, command: Command) {
        this.client.logger.log(`${message.author.tag} (ID: ${message.author.id}) => ${command.id} (${message.util?.parsed?.alias ?? command.id})`);
    }
}
