import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export class DestroyCommand extends Command {
    constructor() {
        super('destroy', {
            aliases: ['destroy'],
            category: 'owner',
            ownerOnly: true,
            args: [{
                id: 'force',
                match: 'flag',
                flag: '--force'
            }]
        });
    }

    exec(message: Message, { force }: { force: boolean }) {
        if (force) return process.exit(0);
        return message.channel.send('Disconnecting bot...').then(() => this.client.destroy());
    }
};
