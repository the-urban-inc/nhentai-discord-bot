import { Client, Command, Track } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';
import { AudioPlayerStatus, AudioResource } from '@discordjs/voice';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'nowplaying',
            type: ApplicationCommandType.ChatInput,
            description: 'Shows the current playing track',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const subscription = this.client.subscriptions.get(interaction.guildId);
        if (subscription) {
            if (subscription.audioPlayer.state.status === AudioPlayerStatus.Idle)
                return interaction.editReply("❌\u2000Nothing's playing in this server!");
            const { title, url, imageURL, circle, duration } = (
                subscription.audioPlayer.state.resource as AudioResource<Track>
            ).metadata;
            const currentTime = (subscription.audioPlayer.state.resource as AudioResource<Track>)
                .playbackDuration;
            const time = new Date(currentTime).toISOString().substring(11, 19);
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle('▶️\u2000Now Playing')
                        .setDescription(`[${title}](${url})\n\`[${time} / ${duration}]\``)
                        .setThumbnail(imageURL)
                        .setFooter({ text: `Circle: ${circle}` }),
                ],
            });
        }
        return interaction.editReply("❌\u2000Nothing's playing in this server!");
    }
}
