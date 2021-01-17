import { Listener } from '@structures';
import { Message, TextChannel } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('error', {
            emitter: 'commandHandler',
            event: 'error',
            category: 'commandHandler',
        });
    }

    exec(err: Error, message: Message) {
        this.client.logger.error('A handler error occured.');
        this.client.logger.stackTrace(err);
        if (
            message.guild &&
            !(message.channel as TextChannel).permissionsFor(this.client.user).has('SEND_MESSAGES')
        )
            return;
        return message.channel.send(this.client.embeds.internalError(err.message));
    }
}
