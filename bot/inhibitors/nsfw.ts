import { Message, DMChannel } from 'discord.js';
import { Command, Inhibitor } from 'discord-akairo';
import { Embeds } from '@nhentai/utils/embeds';

export class NSFWInhibitor extends Inhibitor {
    constructor() {
        super('nsfw', {
            reason: 'nsfw'
        })
    }

    exec(message: Message, command: Command) {
        // bypass check for DM
        if (message.channel instanceof DMChannel) return false;
        let ok = (!message.channel.nsfw && (command.categoryID == 'general' || command.categoryID == 'images'));
        if (ok) message.channel.send(Embeds.error('🔞 This command cannot be run in a SFW channel.'));
        return ok;
    }
};