import { Command } from 'discord-akairo';
import { Message, MessageEmbed, GuildMember } from 'discord.js';
import he from 'he';
import { IUser, User } from '@nhentai/models/user';
import { NhentaiClient } from '@nhentai/struct/Client';
import { Tag } from '@nhentai/struct/nhentai/src/struct';
import { gshorten } from '@nhentai/utils/extensions';
import { Logger } from '@nhentai/utils/logger';
import { Embeds } from '@nhentai/utils/embeds';
import { ICON } from '@nhentai/utils/constants';

export class FavoritesCommand extends Command {
	constructor() {
		super('favorites', {
            category: 'general',
			aliases: ['favorites', 'favourites'],
			description: {
                content: 'Check your (or your buddy\'s) favorites list.\nTo add a doujin to your favorites list, react with `❤️`',
                usage: '[user]',
                examples: ['', '@nhentai#7217']
            },
            args: [{
                id: 'member',
                type: 'member'
            }],
            cooldown: 3000
		});
    }

	async exec(message: Message, { member }: { member: GuildMember }) {
        member = member || message.member;
        await User.findOne({
            userID: member.id
        }, async (err: Error, user: IUser) => {
            if (err) {
				Logger.error(err);
				return message.channel.send(Embeds.error());
			}
            if (!user) return message.channel.send(Embeds.error('Favorites list not found.'));
            else {
                if (!user.favorites.length) return message.channel.send(Embeds.error('Favorites list not found.'));
                let msg = await message.channel.send('Fetching favorites ... The longer your favorites list is, the more time you have to wait ...');
                const display = Embeds.display(this.client as NhentaiClient);
                for (let i = 0, a = user.favorites; i < a.length; i++) {
                    const code = a[i].replace(/ .*/,'');
                    const doujin = await (this.client as NhentaiClient).nhentai.g(code).then(doujin => doujin).catch(err => Logger.error(err));
                    if (!doujin) return message.channel.send(Embeds.error());
                    const info = new MessageEmbed()
                        .setAuthor(he.decode(doujin.title.english), ICON, `https://nhentai.net/g/${doujin.id}`)
                        .setThumbnail(doujin.getCoverThumbnail())
                        .setTimestamp()
                    let t = new Map();
                    doujin.tags.forEach((tag: Tag) => {
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
                        ['category', 'Categories']
                    ]
                    .forEach(
                        ([key, fieldName]) => 
                            t.has(key)
                            && info.addField(fieldName, gshorten(t.get(key)))
                    )
                    display.addPage(info, doujin.id);
                }
                return display.run(message, await msg.edit('Done.'));
            }
		});
	}
};