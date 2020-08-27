import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('ping', {
            aliases: ['ping', 'hello'],
            description: {
                content: 'Pings Amaterasu.',
                examples: [''],
            },
        });
    }

    async exec(msg: Message) {
        const sent = await msg.channel.send('Pong!');
        const timeDiff =
            (sent.editedAt || sent.createdAt).getMilliseconds() -
            (msg.editedAt || msg.createdAt).getMilliseconds();
        return sent.edit(
            `🔂 **RTT**: ${timeDiff} ms\n💟 **Heartbeat**: ${Math.round(this.client.ws.ping)} ms`
        );
    }
}
