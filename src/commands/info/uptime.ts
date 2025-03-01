import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'uptime',
            type: ApplicationCommandType.ChatInput,
            description: 'Shows bot uptime',
        });
    }

    exec(interaction: CommandInteraction) {
        return interaction.editReply({
            content: null,
            embeds: [
                this.client.embeds
                    .default()
                    .setDescription(
                        `⏰ **Uptime**: ${
                            this.client.uptime
                                ? this.client.util.formatMilliseconds(this.client.uptime)
                                : 'N/A'
                        }`
                    ),
            ],
        });
    }
}
