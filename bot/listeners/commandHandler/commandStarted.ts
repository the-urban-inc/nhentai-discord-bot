import { Command, Listener } from 'discord-akairo';
import { Message } from 'discord.js';
import { Logger } from '@nhentai/utils/logger';

export class CommandStartedListener extends Listener {
    constructor() {
        super('commandStarted', {
            emitter: 'commandHandler',
            event: 'commandStarted',
            category: 'commandHandler'
        });
    }

    exec(message: Message, command: Command) {
        Logger.log(`${message.author.tag} (ID: ${message.author.id}) => ${command.id}`);
    }
};
