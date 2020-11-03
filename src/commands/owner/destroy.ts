import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('destroy', {
            aliases: ['destroy'],
            channel: 'guild',
            ownerOnly: true,
            args: [
                {
                    id: 'force',
                    match: 'flag',
                    flag: '--force',
                },
            ],
        });
    }

    async exec(message: Message, { force }: { force: boolean }) {
        if (force) return process.exit(0);
        return message.channel.send('Disconnecting bot...').then(() => this.client.destroy());
    }
}
