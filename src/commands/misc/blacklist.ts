import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import { User } from '@inari/models/user';

export default class extends Command {
    constructor() {
        super('blacklist', {
            aliases: ['blacklist'],
            channel: 'guild',
            nsfw: true,
            description: {
                content: 'View your blacklist',
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
                return message.channel.send(this.client.embeds.info('Blacklist not found.'));
            } else {
                if (!user.blacklists.length)
                    return message.channel.send(
                        this.client.embeds.info('Blacklist not found.')
                    );
                let embed = this.client.util
                    .embed()
                    .setAuthor(`${member.tag}'s Blacklist`, member.displayAvatarURL())
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
