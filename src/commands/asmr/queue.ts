import { Client, Command, Track } from '@structures';
import { CommandInteraction } from 'discord.js';
import { AudioPlayerStatus, AudioResource } from '@discordjs/voice';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'queue',
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
            const current = `__Now Playing:__\n[${
                (subscription.audioPlayer.state.resource as AudioResource<Track>).metadata.title
            }](${(subscription.audioPlayer.state.resource as AudioResource<Track>).metadata.url})`;
            if (!subscription.queue.length) {
                return interaction.editReply({
                    embeds: [
                        this.client.embeds
                            .default()
                            .setTitle(`Queue for ${interaction.guild.name}`)
                            .setThumbnail(
                                (subscription.audioPlayer.state.resource as AudioResource<Track>)
                                    .metadata.imageURL
                            )
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
                        .setFooter(`Page 1 of ${Math.ceil(subscription.queue.length / 5)}`),
                ],
            });
        }
        return interaction.editReply("❌\u2000Nothing's playing in this server!");
    }
}
