import { Client, Command } from '@structures';
import { CommandInteraction, Message } from 'discord.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'ping',
            type: 'CHAT_INPUT',
            description: 'Shows RTT and heartbeat of the bot',
        });
    }

    async exec(interaction: CommandInteraction) {
        const sent = (await interaction.editReply('Pong!')) as Message;
        const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
        return interaction.editReply({
            content: null,
            embeds: [
                this.client.embeds
                    .default()
                    .setDescription(
                        `🔂 **RTT**: ${timeDiff} ms\n💟 **Heartbeat**: ${Math.round(
                            this.client.ws.ping
                        )} ms`
                    ),
            ],
        });
    }
}
