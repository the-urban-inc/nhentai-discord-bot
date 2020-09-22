import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import { WatchModel } from '@notifier/index';

export default class extends Command {
    constructor() {
        super('follow', {
            aliases: ['follow'],
            channel: 'guild',
            description: {
                content: 'View your follow list',
            },
        });
    }

    async exec(message: Message) {
        try {
            const member = message.author;
            const tags = await WatchModel.find({ 'user': member.id }).exec();
            if (!tags) {
                return message.channel.send(this.client.embeds.info('Follow list not found.'));
            } else {
                if (!tags.length)
                    return message.channel.send(
                        this.client.embeds.info('Follow list not found.')
                    );
                let embed = this.client.util
                    .embed()
                    .setAuthor(`${member.tag}'s Follow List`, member.displayAvatarURL())
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
