import { Command, Listener } from '@structures';
import { Message } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('handler-error', {
            emitter: 'commandHandler',
            event: 'error',
            category: 'commandHandler',
        });
    }

    exec(err: Error, message: Message, command: Command) {
        this.client.logger.error(err.message);
        if (!command || !message) return this.client.logger.stackTrace(err);
        return message.channel.send(this.client.embeds.commandError(err, message, command));
    }
}
