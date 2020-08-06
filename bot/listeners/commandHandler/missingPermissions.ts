import { Message, TextChannel } from 'discord.js';
import { Command, Listener } from 'discord-akairo';
import { capitalize } from '@nhentai/utils/extensions';
import { Logger } from '@nhentai/utils/logger';
import { Embeds } from '@nhentai/utils/embeds';

export class MissingPermissionsListener extends Listener {
    constructor() {
        super('missingPermissions', {
            emitter: 'commandHandler',
            event: 'missingPermissions',
            category: 'commandHandler'
        });
    }

    exec(message: Message, command: Command, type: string, missing: any) {
        Logger.log(`=> ${command.id} ~ ${type} is missing permissions: ${missing}`);
        if (message.guild && !(message.channel as TextChannel).permissionsFor(this.client.user).has('SEND_MESSAGES')) return;
        message.channel.send(Embeds.error(`${capitalize(type)} is missing the following permissions: ${missing.join(', ')}.`));
    }
};
