import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import he from 'he';
import { IUser, User } from '../../../models/user';

exports = class TagCommand extends Command {
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
            },{
                id: 'sort',
                match: 'option',
                flag: ['--sort=', '-s='],
                default: 'recent'
            }],
            cooldown: 3000
		});
    }

	async exec(message: Message, { text, page, sort } : { text: string, page: unknown, sort: string }) {
        if (!text) return message.channel.send((this.client as any).embeds('error', 'Tag name is not specified.'));
        page = parseInt(String(page), 10);
        if (!['recent', 'popular-today', 'popular-week', 'popular'].includes(sort)) return message.channel.send((this.client as any).embeds('error', 'Invalid sort method provided. Available methods are: `recent`, `popular-today`, `popular-week`, `popular`.'));
        const tag = message.util.parsed.alias;
        let data = null;
        try {
            data = await (this.client as any).nhentai[tag](text.toLowerCase(), page, sort);
            if (!data) throw '';
        } catch {
            return message.channel.send(
                (this.client as any).embeds(
                    'error',
                    'An unexpected error has occurred. Are you sure this is an existing tag?'
                )
            )
        };
        if (!data.results.length) return message.channel.send((this.client as any).embeds('error', 'No results, sorry.'));
        if (!page || page < 1 || page > data.num_pages) return message.channel.send((this.client as any).embeds('error', 'Page number is not an integer or is out of range.'));

        await User.findOne({
            userID: message.author.id
        }, async (err: Error, user: IUser) => {
            if (err) {
                return (this.client as any).logger.error(err);
            }
            if (!user) {
                const newUser = new User({
                    userID: message.author.id,
                    history: {
                        [tag]: [{
                            id: text.toLowerCase(),
                            title: text.toLowerCase(),
                            date: Date.now()
                        }]
                    }
                });
                newUser.save().catch(err => {
                    return (this.client as any).logger.error(err);
                });
            } else {
                user.history[tag].push({
                    id: text.toLowerCase(),
                    title: text.toLowerCase(),
                    date: Date.now()
                });
                user.save().catch(err => {
                    return (this.client as any).logger.error(err);
                });
            }
        });

        const display = (this.client as any).embeds('display').useCustomFooters();
        for (const [idx, doujin] of data.results.entries()) {
            display.addPage(new MessageEmbed()
                .setTitle(`${he.decode(doujin.title)}`)
                .setURL(`https://nhentai.net/g/${doujin.id}`)
                .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${(this.client as any).flag[doujin.language] || 'N/A'}`)
                .setImage(doujin.thumbnail.s)
                .setFooter(`Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${data.num_pages || 1} • ${data.num_results} doujin(s)`)
                .setTimestamp(), doujin.id)
        }
        return display.run(message, await message.channel.send('Searching ...'));
	}
};