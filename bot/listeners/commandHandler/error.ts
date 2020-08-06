import { Listener } from 'discord-akairo';
import { Message, TextChannel } from 'discord.js';
import { Logger } from '@nhentai/utils/logger';
import { Embeds } from '@nhentai/utils/embeds';

export class ErrorListener extends Listener {
    constructor() {
        super('error', {
            emitter: 'commandHandler',
            event: 'error',
            category: 'commandHandler'
        });
    }

    exec(err: Error, message: Message) {
        Logger.error('A handler error occured.');
        Logger.stackTrace(err);
        if (message.guild && !(message.channel as TextChannel).permissionsFor(this.client.user).has('SEND_MESSAGES')) return;
        return message.channel.send(Embeds.error());
    }
};
