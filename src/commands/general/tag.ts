import { Command } from '@structures/Command';
import { Message } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { Sort } from '@api/nhentai';
import { BLOCKED_MESSAGE } from '@utils/constants';

const TAGS = ['tag', 'artist', 'character', 'parody', 'group', 'language'] as const;
const SORT_METHODS = Object.keys(Sort).map(s => Sort[s]);

export default class extends Command {
    constructor() {
        super('tag', {
            aliases: ['tag', 'artist', 'character', 'parody', 'group', 'language', 'category'],
            areMultipleCommands: true,
            channel: 'guild',
            nsfw: true,
            description: {
                content: 'Searches nhentai for specifed @',
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
            this.warning = false;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    async exec(
        message: Message,
        {
            text,
            page,
            sort,
            dontLogErr,
        }: { text: string; page: string; sort: string; dontLogErr?: boolean }
    ) {
        try {
            const tag = message.util.parsed.alias as typeof TAGS[number];

            if (!text)
                throw new TypeError(`${this.client.util.capitalize(tag)} name was not specified.`);

            if (!Object.values(Sort).includes(sort as Sort))
                throw new TypeError(
                    `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                        s => `\`${s}\``
                    ).join(', ')}.`
                );

            let pageNum = parseInt(page, 10);
            const data =
                sort === 'recent'
                    ? await this.client.nhentai[tag](text.toLowerCase(), pageNum)
                    : await this.client.nhentai[tag](text.toLowerCase(), pageNum, sort as Sort);
            const { result, tag_id, num_pages, num_results } = data;
            if (!result.length) throw new Error('No results, sorry.');

            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > num_pages)
                throw new RangeError('Page number is not an integer or is out of range.');

            const id = tag_id.toString(),
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

            const { displayList, rip } = this.client.embeds.displayGalleryList(
                result,
                this.danger,
                this.blacklists,
                {
                    page: pageNum,
                    num_pages,
                    num_results,
                    additional_options: { follow: true, blacklist: true },
                }
            );
            if (rip) this.warning = true;
            await displayList
                .setInfo({ id, type: tag, name })
                .run(this.client, message, await message.channel.send('Searching ...'), '', {
                    idle: 300000,
                    danger: this.danger,
                });
            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ image: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Loading ...'), '', {
                        time: 300000,
                    });
            }
        } catch (err) {
            if (dontLogErr) return;
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.clientError(err));
        }
    }
}
