import { Command } from '@structures';
import { Message } from 'discord.js';
import { WatchModel } from '@notifier/db/models/record';

export default class extends Command {
    constructor() {
        super('follow', {
            aliases: ['follow', 'followlist'],
            nsfw: true,
            cooldown: 10000,
            description: {
                content: 'Shows your own follow list.',
                examples: ['\nShows your own follow list.'],
            },
        });
    }

    async exec(message: Message) {
        try {
            const member = message.author;
            const tags = await WatchModel.find({ user: member.id }).exec();
            if (!tags) {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setTitle('Follow List')
                        .setDescription("You haven't followed anything!")
                        .setFooter(member.tag, member.displayAvatarURL())
                );
            } else {
                if (!tags.length) {
                    return message.channel.send(
                        this.client.embeds
                            .default()
                            .setTitle('Follow List')
                            .setDescription("You haven't followed anything!")
                            .setFooter(member.tag, member.displayAvatarURL())
                    );
                }
                let embed = this.client.embeds
                    .default()
                    .setTitle(`Follow List`)
                    .setFooter(member.tag, member.displayAvatarURL());
                let t = new Map<string, string[]>();
                tags.forEach(tag => {
                    const { type, name } = tag;
                    let a = t.get(type) || [];
                    a.push(`\`${name}\``);
                    t.set(type, a);
                });
                [
                    ['parody', 'Parodies'],
                    ['character', 'Characters'],
                    ['tag', 'Tags'],
                    ['artist', 'Artists'],
                    ['group', 'Groups'],
                    ['language', 'Languages'],
                    ['category', 'Categories'],
                ].forEach(([key, fieldName]) => {
                    t.has(key) && embed.addField(fieldName, t.get(key).join(', '));
                });
                return message.channel.send(embed);
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
