import { Inhibitor } from '@structures';
import { Message, TextChannel, DMChannel, PermissionResolvable } from 'discord.js';
import { PERMISSIONS } from '@utils/constants';

export default class extends Inhibitor {
    constructor() {
        super('permissions', {
            reason: 'permissions',
        });
    }

    async exec(message: Message) {
        if (message.channel instanceof DMChannel) return false;
        let ok = false,
            requirements: Array<string> = [];
        PERMISSIONS.forEach((x: PermissionResolvable) => {
            if (
                !(message.channel as TextChannel).permissionsFor(this.client.user).has(x) &&
                x !== 'CHANGE_NICKNAME'
            )
                (ok = true), requirements.push(this.client.util.capitalize(x as string));
        });
        if (ok) {
            if (!message.author.dmChannel) await message.author.createDM();
            if (requirements.includes('Send Messages') && message.author.dmChannel)
                message.author.dmChannel.send(
                    this.client.embeds.clientError(
                        `I can't send messages in that channel. Make sure I have the proper permissions before calling me.`
                    )
                );
            else
                message.channel.send(
                    this.client.embeds.clientError(
                        `I'm missing the following permissions to execute your command: ${requirements
                            .map(x => `${this.client.util.toTitleCase(x)}`)
                            .join(' ')}.`
                    )
                );
        }
        return ok;
    }
}
