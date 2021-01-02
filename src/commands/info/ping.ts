import { Command } from '@structures/Command';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('ping', {
            aliases: ['ping', 'hello'],
            channel: 'guild',
            description: {
                content: 'Pings Inari.',
            },
        });
    }

    async exec(message: Message) {
        const sent = await message.channel.send('Pong!');
        const timeDiff = sent.createdTimestamp - message.createdTimestamp;
        return sent.edit(
            `🔂 **RTT**: ${timeDiff} ms\n💟 **Heartbeat**: ${Math.round(this.client.ws.ping)} ms`
        );
    }
}
