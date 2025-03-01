import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'skip',
            type: ApplicationCommandType.ChatInput,
            description: 'Skips to the next ASMR file',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const subscription = this.client.subscriptions.get(interaction.guildId);
        if (subscription) {
            subscription.audioPlayer.stop();
            return interaction.editReply('⏩\u2000Skipped file');
        }
        return interaction.editReply("❌\u2000Nothing's playing in this server!");
    }
}
