import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('nowplaying', {
            aliases: ['nowplaying', 'np'],
            nsfw: true,
            description: {
                content: 'Now playing.',
                examples: ["\nHey, what's playing?"],
            },
        });
    }

    async exec(message: Message) {
        try {
            const connection = message.guild.voice?.connection;
            if (!connection || !connection.dispatcher || !this.client.current.get(message.guild.id)) {
                return message.channel.send(
                    this.client.embeds.default().setDescription("Nothing's playing")
                );
            }
            let { title, url, duration } = this.client.current.get(message.guild.id);
            if (connection.channel) {
                const time = connection.dispatcher.streamTime;
                const now = '`🔘`';
                const progress = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
                const i = Math.round(progress.length * (time / duration));
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setAuthor(`▶️\u2000Now Playing`)
                        .setDescription(
                            `[${title}](${url})\n${
                                progress.slice(0, i) + now + progress.slice(i + 1)
                            }\u2000${this.client.util.formatMilliseconds(time)} / ${this.client.util.formatMilliseconds(duration)}`
                        )
                        .setFooter(`Broadcasting in ${connection.channel.name}\u2000•\u2000ASMR file from jasmr.net`)
                );
            }
        } catch (err) {
            return this.client.logger.error(err.message);
        }
    }
}
