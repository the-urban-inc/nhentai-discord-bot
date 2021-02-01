import { Command } from '@structures';
import { Message } from 'discord.js';
import { User } from '@models/user';

export default class extends Command {
    constructor() {
        super('blacklist', {
            aliases: ['blacklist'],
            nsfw: true,
            cooldown: 10000,
            description: {
                content: 'Shows your own blacklist.',
                examples: ['\nEverybody has stuffs they dislike.'],
            },
        });
    }

    async exec(message: Message) {
        try {
            const member = message.author;
            const user = await User.findOne({
                userID: member.id,
            }).exec();
            if (!user) {
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setTitle('Blacklist')
                        .setDescription('You have no blacklist entry!')
                        .setFooter(member.tag, member.displayAvatarURL())
                );
            } else {
                if (!user.blacklists.length) {
                    return message.channel.send(
                        this.client.embeds
                            .default()
                            .setTitle('Blacklist')
                            .setDescription('You have no blacklist entry!')
                            .setFooter(member.tag, member.displayAvatarURL())
                    );
                }
                let embed = this.client.embeds
                    .default()
                    .setTitle(`Blacklist`)
                    .setFooter(member.tag, member.displayAvatarURL());
                let t = new Map<string, string[]>();
                user.blacklists.forEach(tag => {
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
