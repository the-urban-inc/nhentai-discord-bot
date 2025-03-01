import { Client, Command, Track } from '@structures';
import { ApplicationCommandType, CommandInteraction } from 'discord.js';
import { AudioPlayerStatus, AudioResource } from '@discordjs/voice';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'queue',
            type: ApplicationCommandType.ChatInput,
            description: 'Shows the current queue',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const subscription = this.client.subscriptions.get(interaction.guildId);
        if (subscription) {
            if (subscription.audioPlayer.state.status === AudioPlayerStatus.Idle)
                return interaction.editReply("❌\u2000Nothing's playing in this server!");
            const { title, url, imageURL, duration } = (
                subscription.audioPlayer.state.resource as AudioResource<Track>
            ).metadata;
            const currentTime = (subscription.audioPlayer.state.resource as AudioResource<Track>)
                .playbackDuration;
            const time = new Date(currentTime).toISOString().substring(11, 19);
            const current = `__Now Playing:__\n[${title}](${url})\n\`[${time} / ${duration}]\``;
            if (!subscription.queue.length) {
                return interaction.editReply({
                    embeds: [
                        this.client.embeds
                            .default()
                            .setTitle(`Queue for ${interaction.guild.name}`)
                            .setThumbnail(imageURL)
                            .setDescription(`${current}`),
                    ],
                });
            }
            const queue = subscription.queue
                .slice(0, 5)
                .map((track, index) => `${index + 1}. [${track.title}](${track.url})`)
                .join('\n');

            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle(`Queue for ${interaction.guild.name}`)
                        .setDescription(`${current}\n\n__Up Next:__${queue}`)
                        .setThumbnail(subscription.queue[0].imageURL)
                        .setFooter({
                            text: `Page 1 of ${Math.ceil(subscription.queue.length / 5)}`,
                        }),
                ],
            });
        }
        return interaction.editReply("❌\u2000Nothing's playing in this server!");
    }
}
