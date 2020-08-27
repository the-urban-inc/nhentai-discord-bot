import Command from '@nhentai/struct/bot/Command';
import { Message, MessageEmbed } from 'discord.js';
import he from 'he';
import { User } from '@nhentai/models/user';
import { FLAG_EMOJIS, SORT_METHODS, TAGS } from '@nhentai/utils/constants';

export default class extends Command {
    constructor() {
        super('tag', {
            category: 'general',
            aliases: ['tag', 'artist', 'character', 'parody', 'group', 'language'],
            description: {
                usage: `[--page=pagenum] [--sort=(${SORT_METHODS.join('/')})]`,
            },
            args: [
                {
                    id: 'text',
                    type: 'string',
                    match: 'text',
                },
                {
                    id: 'page',
                    match: 'option',
                    flag: ['--page=', '-p='],
                    default: '1',
                },
                {
                    id: 'sort',
                    match: 'option',
                    flag: ['--sort=', '-s='],
                    default: 'recent',
                },
            ],
            cooldown: 3000,
        });
    }

    async exec(
        message: Message,
        { text, page, sort }: { text: string; page: string; sort: string }
    ) {
        try {
            const tag = message.util.parsed.alias as typeof TAGS[number];
            if (!text)
                return message.channel.send(
                    this.client.embeds.clientError(
                        `${this.client.util.capitalize(tag)} name was not specified.`
                    )
                );
            if (!SORT_METHODS.includes(sort))
                return message.channel.send(
                    this.client.embeds.clientError(
                        `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                            s => `\`${s}\``
                        ).join(', ')}.`
                    )
                );
            let pageNum = parseInt(page, 10);
            let data = await this.client.nhentai[tag](text.toLowerCase(), pageNum, sort);
            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > data.num_pages)
                return message.channel.send(
                    this.client.embeds.clientError(
                        'Page number is not an integer or is out of range.'
                    )
                );
            if (!data.results.length)
                return message.channel.send(this.client.embeds.clientError('No results, sorry.'));

            let user = await User.findOne({
                userID: message.author.id,
            }).exec();

            if (!user) {
                const newUser = new User({
                    userID: message.author.id,
                    history: {
                        [tag]: [
                            {
                                id: data.tagId,
                                title: text.toLowerCase(),
                                date: Date.now(),
                            },
                        ],
                    },
                });
                newUser.save();
            } else {
                user.history[tag].push({
                    id: data.tagId,
                    title: text.toLowerCase(),
                    date: Date.now(),
                });
                user.save();
            }

            const display = this.client.embeds.richDisplay().useCustomFooters();
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(
                    new MessageEmbed()
                        .setTitle(`${he.decode(doujin.title)}`)
                        .setURL(`https://nhentai.net/g/${doujin.id}`)
                        .setDescription(
                            `**ID** : ${doujin.id}\u2000•\u2000**Language** : ${
                                FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] || 'N/A'
                            }`
                        )
                        .setImage(doujin.thumbnail.s)
                        .setFooter(
                            `Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${
                                data.num_pages || 1
                            } • ${data.num_results} doujin(s)`
                        )
                        .setTimestamp(),
                    doujin.id
                );
            }
            return display.run(this.client, message, await message.channel.send('Searching ...'));
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
