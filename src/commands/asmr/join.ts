import { Client, Command, MusicSubscription } from '@structures';
import { CommandInteraction, GuildMember } from 'discord.js';
import {
    DiscordGatewayAdapterCreator,
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus,
} from '@discordjs/voice';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'join',
            type: 'CHAT_INPUT',
            description: 'Joins voice channel',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        let subscription = this.client.subscriptions.get(interaction.guildId);
        if (!subscription) {
            if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
                const channel = interaction.member.voice.channel;
                subscription = new MusicSubscription(
                    joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild
                            .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
                    })
                );
                subscription.voiceConnection.on('error', error => this.client.logger.error(error));
                this.client.subscriptions.set(interaction.guildId, subscription);
            }
        }

        if (!subscription) {
            throw new Error('No voice channel found.');
        }

        try {
            await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
        } catch (error) {
            this.client.logger.error(error);
            throw new Error(
                'Failed to join voice channel within 20 seconds, please try again later!'
            );
        }
    }
}
