import { Command, Listener } from '@structures';
import { Message, TextChannel } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('missingPermissions', {
            emitter: 'commandHandler',
            event: 'missingPermissions',
            category: 'commandHandler',
        });
    }

    exec(message: Message, command: Command, type: string, missing: any) {
        this.client.logger.log(`=> ${command.id} ~ ${type} is missing permissions: ${missing}`);
        if (
            message.guild &&
            !(message.channel as TextChannel).permissionsFor(this.client.user).has('SEND_MESSAGES')
        )
            return;
        message.channel.send(
            this.client.embeds.clientError(
                `${this.client.util.capitalize(
                    type
                )} is missing the following permissions: ${missing.join(', ')}.`
            )
        );
    }
}
