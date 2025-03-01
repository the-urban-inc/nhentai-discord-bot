import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'pause',
            type: ApplicationCommandType.ChatInput,
            description: 'Pauses the ASMR file that is playing',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const subscription = this.client.subscriptions.get(interaction.guildId);
        if (subscription) {
            subscription.audioPlayer.pause();
            return interaction.editReply('⏸️\u2000Paused!');
        }
        return interaction.editReply("❌\u2000Nothing's playing in this server!");
    }
}
