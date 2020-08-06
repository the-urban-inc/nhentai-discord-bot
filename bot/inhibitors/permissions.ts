import { Message, TextChannel, DMChannel } from 'discord.js';
import { Inhibitor } from 'discord-akairo';
import { Embeds } from '@nhentai/utils/embeds';
import { PERMISSIONS } from '@nhentai/utils/constants';

export class PermissionsInhibitor extends Inhibitor {
    constructor() {
        super('permissions', {
            reason: 'permissions'
        });
    }

    async exec(message: Message) {
        if (message.channel instanceof DMChannel) return false;
        let ok = false, requirements: Array<string>;
        Object.keys(PERMISSIONS).forEach((x: keyof typeof PERMISSIONS) => { 
            if (!(message.channel as TextChannel).permissionsFor(this.client.user).has(x)) ok = true, requirements.push(PERMISSIONS[x]); 
        });
        if (ok) {
            if (!message.author.dmChannel) await message.author.createDM();
            if (requirements.includes('Send Messages') && message.author.dmChannel) message.author.dmChannel.send(Embeds.error(`I can't send messages in that channel. Make sure I have the proper permissions before calling me.`)) 
            else message.channel.send(Embeds.error(`I'm missing the following permissions to execute your command: ${requirements.map((x) => `${x}`).join(' ')}.`))
        }
        return ok;
    }
};
