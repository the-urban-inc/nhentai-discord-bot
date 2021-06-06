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
            const connection = message.guild.voice.connection;
            const { title, url, duration } = this.client.current.get(message.guild.id);
            console.log(duration);
            if (!connection || !connection.dispatcher || !duration || isNaN(duration)) {
                return message.channel.send(
                    this.client.embeds.default().setDescription("Nothing's playing")
                );
            }
            if (connection.channel) {
                const time = connection.dispatcher.streamTime / 1000;
                const cm = String(time / 60).padStart(2, '0'),
                    cs = String(time % 60).padStart(2, '0');
                const tm = String(duration / 60).padStart(2, '0'),
                    ts = String(duration % 60).padStart(2, '0');
                const now = '🔵';
                const progress = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
                const i = Math.round(progress.length * (time / duration));
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setAuthor(`▶️\u2000Now Playing`)
                        .setDescription(
                            `[${title}](${url})\n${
                                progress.slice(0, i) + now + progress.slice(i + 1)
                            }\u2000${cm}:${cs}/${tm}:${ts}`
                        )
                        .setFooter('ASMR file from jasmr.net')
                );
            }
        } catch (err) {
            return this.client.logger.error(err.message);
        }
    }
}
