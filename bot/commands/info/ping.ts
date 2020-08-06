import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export class PingCommand extends Command {
    constructor() {
        super('ping', {
            aliases: ['ping', 'hello']
        });
    }

    async exec(message: Message) {
        const sent = await message.channel.send('Pong!');
        const timeDiff = (sent.editedAt || sent.createdAt).getMilliseconds() - (message.editedAt || message.createdAt).getMilliseconds();
        return sent.edit(`🔂 **RTT**: ${timeDiff} ms\n💟 **Heartbeat**: ${Math.round(this.client.ws.ping)} ms`);
    }
};