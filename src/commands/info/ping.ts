import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('ping', {
            aliases: ['ping', 'hello'],
            description: {
                content: 'Shows RTT and heartbeat of nhentai.',
                examples: ['\nPong!'],
            },
        });
    }

    async exec(message: Message) {
        const sent = await message.channel.send('Pong!');
        const timeDiff = sent.createdTimestamp - message.createdTimestamp;
        return sent.edit(
            '',
            this.client.embeds
                .default()
                .setDescription(
                    `🔂 **RTT**: ${timeDiff} ms\n💟 **Heartbeat**: ${Math.round(
                        this.client.ws.ping
                    )} ms`
                )
        );
    }
}
