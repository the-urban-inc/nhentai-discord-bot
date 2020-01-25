const { Command } = require('discord-akairo');

module.exports = class PingCommand extends Command {
    constructor() {
        super('ping', {
            aliases: ['ping', 'hello']
        });
    }

    async exec(message) {
        const sent = await message.channel.send('Pong!');
        const timeDiff = (sent.editedAt || sent.createdAt) - (message.editedAt || message.createdAt);
        return sent.edit(`🔂 **RTT**: ${timeDiff} ms\n💟 **Heartbeat**: ${Math.round(this.client.ping)} ms`);
    }
};