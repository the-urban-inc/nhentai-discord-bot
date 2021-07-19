import { Client, Command } from '@structures';
import { CommandInteraction } from 'discord.js';
import { SUPPORT_SERVER } from '@constants';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'support',
            description: 'Join the support server',
        });
    }

    exec(interaction: CommandInteraction) {
        return interaction.editReply(SUPPORT_SERVER);
    }
}
