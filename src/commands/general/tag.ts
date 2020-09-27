import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import { User } from '@nhentai/models/user';
import { Server } from '@nhentai/models/server';
import { Blacklist } from '@nhentai/models/tag';
import { List } from '@nhentai/struct/nhentai/src/struct';
import { FLAG_EMOJIS, SORT_METHODS, BANNED_TAGS, BLOCKED_MESSAGE } from '@nhentai/utils/constants';
import he from 'he';

const TAGS = ['tag', 'artist', 'character', 'parody', 'group', 'language'] as const;

export default class extends Command {
    constructor() {
        super('tag', {
            aliases: ['tag', 'artist', 'character', 'parody', 'group', 'language', 'category'],
            channel: 'guild',
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
        });
    }

    anonymous = true;
    danger = false;
    warning = false;
    blacklists: Blacklist[] = [];

    async before(message: Message) {
        try {
            let user = await User.findOne({ userID: message.author.id }).exec();
            if (!user) {
                user = await new User({
                    blacklists: [],
                    anonymous: true,
                }).save();
            }
            this.blacklists = user.blacklists;
            this.anonymous = user.anonymous;
            let server = await Server.findOne({ serverID: message.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    settings: { danger: false },
                }).save();
            }
            this.danger = server.settings.danger;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
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
            let data = (await this.client.nhentai[tag](text.toLowerCase(), pageNum, sort)) as List;

            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > data.num_pages)
                return message.channel.send(
                    this.client.embeds.clientError(
                        'Page number is not an integer or is out of range.'
                    )
                );

            if (!data.results.length)
                return message.channel.send(this.client.embeds.clientError('No results, sorry.'));

            const { tagId, results, num_pages, num_results } = data;
            const id = tagId.toString(),
                name = text.toLowerCase();

            if (!this.anonymous) {
                await this.client.db.User.history(message.author, {
                    id,
                    type: tag,
                    name,
                    author: message.author.id,
                    guild: message.guild.id,
                    date: Date.now(),
                });
            }

            const display = this.client.embeds
                .richDisplay({ info: true, follow: true, blacklist: true, download: true })
                .setInfo({ id, type: tag, name })
                .useCustomFooters();
            for (const [idx, { id, title, language, dataTags, thumbnail }] of results.entries()) {
                let embed = this.client.util
                    .embed()
                    .setTitle(`${he.decode(title)}`)
                    .setURL(`https://nhentai.net/g/${id}`)
                    .setDescription(
                        `**ID** : ${id}\u2000•\u2000**Language** : ${
                            FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'
                        }`
                    )
                    .setFooter(
                        ` ${idx + 1} of ${results.length}\u2000•\u2000Page ${page} of ${
                            num_pages || 1
                        }\u2000•\u2000${num_results} doujin(s)`
                    )
                    .setTimestamp();
                const bTags = this.blacklists.filter(b => dataTags.includes(b.id)),
                    len = bTags.length;
                if (len) {
                    embed.description +=
                        '\n\nThis gallery contains ' +
                        (len === 1 ? 'a blacklisted tag' : 'several blacklisted tags') +
                        '. Therefore, thumbnail image will be hidden.';
                    let t = new Map<string, string[]>();
                    bTags.forEach(tag => {
                        const { type, name } = tag;
                        let a = t.get(type) || [];
                        a.push(`\`${name}\``);
                        t.set(type, a);
                    });
                    let s = '';
                    [
                        ['parody', 'Parodies'],
                        ['character', 'Characters'],
                        ['tag', 'Tags'],
                        ['artist', 'Artists'],
                        ['group', 'Groups'],
                        ['language', 'Languages'],
                        ['category', 'Categories'],
                    ].forEach(([key, fieldName]) => {
                        if (t.has(key)) s += `• **${fieldName}** : ${t.get(key).join(', ')}\n`;
                    });
                    embed.addField('Blacklist', this.client.util.shorten(s, '\n', 1024));
                } else {
                    const prip = this.client.util.hasCommon(dataTags, BANNED_TAGS);
                    if (prip) this.warning = true;
                    if (this.danger || !prip) embed.setImage(thumbnail.s);
                }
                display.addPage(embed, id);
            }
            await display.run(this.client, message, await message.channel.send('Searching ...'));
            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ image: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Loading ...'));
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
