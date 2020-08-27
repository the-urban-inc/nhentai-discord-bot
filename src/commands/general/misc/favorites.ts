import Command from '@nhentai/struct/bot/Command';
import { Message, MessageEmbed, GuildMember } from 'discord.js';
import he from 'he';
import { User } from '@nhentai/models/user';
import { Tag } from '@nhentai/struct/nhentai/src/struct';
import { ICON } from '@nhentai/utils/constants';

export default class extends Command {
    constructor() {
        super('favorites', {
            category: 'general',
            aliases: ['favorites', 'favourites'],
            description: {
                content:
                    "Check your (or your buddy's) favorites list.\nTo add a doujin to your favorites list, react with `❤️`",
                usage: '[user]',
                examples: ['', '@nhentai#7217'],
            },
            args: [
                {
                    id: 'member',
                    type: 'member',
                },
            ],
            cooldown: 3000,
        });
    }

    async exec(message: Message, { member }: { member: GuildMember }) {
        try {
            member = member || message.member;
            const user = await User.findOne({
                userID: member.id,
            }).exec();
            if (!user)
                return message.channel.send(
                    this.client.embeds.clientError('Favorites list not found.')
                );
            else {
                if (!user.favorites.length)
                    return message.channel.send(
                        this.client.embeds.clientError('Favorites list not found.')
                    );
                let msg = await message.channel.send(
                    'Fetching favorites... The longer your favorites list is, the more time you will have to wait...'
                );
                const display = this.client.embeds.richDisplay();
                for (let i = 0, a = user.favorites; i < a.length; i++) {
                    const code = a[i].replace(/ .*/, '');
                    const doujin = await this.client.nhentai.g(code);
                    const { title, id, tags } = doujin.details;
                    const info = this.client.util
                        .embed()
                        .setAuthor(he.decode(title.english), ICON, `https://nhentai.net/g/${id}`)
                        .setThumbnail(doujin.getCoverThumbnail())
                        .setTimestamp();
                    let t = new Map();
                    tags.forEach((tag: Tag) => {
                        let a = t.get(tag.type) || [];
                        a.push(`**\`${tag.name}\`**\`(${tag.count.toLocaleString()})\``);
                        t.set(tag.type, a);
                    });

                    [
                        ['parody', 'Parodies'],
                        ['character', 'Characters'],
                        ['tag', 'Tags'],
                        ['artist', 'Artists'],
                        ['group', 'Groups'],
                        ['language', 'Languages'],
                        ['category', 'Categories'],
                    ].forEach(
                        ([key, fieldName]) =>
                            t.has(key) &&
                            info.addField(fieldName, this.client.util.gshorten(t.get(key)))
                    );
                    display.addPage(info, id.toString());
                }
                return display.run(this.client, message, await msg.edit('Done.'));
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
