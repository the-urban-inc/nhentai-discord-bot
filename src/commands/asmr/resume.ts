import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'resume',
            type: ApplicationCommandType.ChatInput,
            description: 'Resumes playback of the current ASMR file',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const subscription = this.client.subscriptions.get(interaction.guildId);
        if (subscription) {
            subscription.audioPlayer.unpause();
            return interaction.editReply('▶️\u2000Resumed!');
        }
        return interaction.editReply("❌\u2000Nothing's playing in this server!");
    }
}
