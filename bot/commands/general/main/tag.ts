import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import he from 'he';
import { IUser, User } from '@nhentai/models/user';
import { NhentaiClient } from '@nhentai/struct/Client';
import { Logger } from '@nhentai/utils/logger';
import { Embeds } from '@nhentai/utils/embeds';
import { FLAG_EMOJIS } from '@nhentai/utils/constants';

export class TagCommand extends Command {
	constructor() {
		super('tag', {
            category: 'general',
			aliases: ['artist', 'character', 'group', 'parody', 'tag'],
			description: {
                content: 'Searches nhentai for given artist/character/group/parody/tag.',
                usage: '<artist/character/group/parody/tag> [--page=pagenum] [--sort=(recent/popular-today/popular-week/popular)]',
                examples: ['hiten', 'yuri -p=2', 'nakadashi -s=popular']
            },
            args: [{
                id: 'text',
                type: 'string',
                match: 'text'
            }, {
                id: 'page',
                match: 'option',
                flag: ['--page=', '-p='],
                default: '1'
            }, {
                id: 'sort',
                match: 'option',
                flag: ['--sort=', '-s='],
                default: 'recent'
            }],
            cooldown: 3000
		});
    }

	async exec(message: Message, { text, page, sort } : { text: string, page: string, sort: string }) {
        if (!text) return message.channel.send(Embeds.error('Tag name is not specified.'));
        let pageNum = parseInt(page, 10);
        if (!['recent', 'popular-today', 'popular-week', 'popular'].includes(sort)) return message.channel.send(Embeds.error('Invalid sort method provided. Available methods are: `recent`, `popular-today`, `popular-week`, `popular`.'));
        const tag = message.util.parsed.alias as keyof IUser['history'];
        let data: any;
        try {
            data = await (this.client as NhentaiClient).nhentai[tag](text.toLowerCase(), pageNum, sort);
            if (!data) throw '';
        } catch {
            return message.channel.send(Embeds.error('An unexpected error has occurred. Are you sure this is an existing tag?'))
        };
        if (!data.results.length) return message.channel.send(Embeds.error('No results, sorry.'));
        if (!pageNum || pageNum < 1 || pageNum > data.num_pages) return message.channel.send(Embeds.error('Page number is not an integer or is out of range.'));

        await User.findOne({
            userID: message.author.id
        }, async (err: Error, user: IUser) => {
            if (err) {
                return Logger.error(err);
            }
            if (!user) {
                const newUser = new User({
                    userID: message.author.id,
                    history: {
                        [tag]: [{
                            id: data.tagID,
                            title: text.toLowerCase(),
                            date: Date.now()
                        }]
                    }
                });
                newUser.save().catch(err => {
                    return Logger.error(err);
                });
            } else {
                user.history[tag].push({
                    id: data.tagID,
                    title: text.toLowerCase(),
                    date: Date.now()
                });
                user.save().catch(err => {
                    return Logger.error(err);
                });
            }
        });

        const display = Embeds.display(this.client as NhentaiClient).useCustomFooters();
        for (const [idx, doujin] of data.results.entries()) {
            display.addPage(new MessageEmbed()
                .setTitle(`${he.decode(doujin.title)}`)
                .setURL(`https://nhentai.net/g/${doujin.id}`)
                .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] || 'N/A'}`)
                .setImage(doujin.thumbnail.s)
                .setFooter(`Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${data.num_pages || 1} • ${data.num_results} doujin(s)`)
                .setTimestamp(), doujin.id)
        }
        return display.run(message, await message.channel.send('Searching ...'));
	}
};