import { Command } from '@structures/Command';
import { Message } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { Sort } from '@api/nhentai';
import { BLOCKED_MESSAGE } from '@utils/constants';

const TAGS = {
    tag: {
        description: 'Searches nhentai for specified tag.',
        examples: [
            ' stockings\nSearches for galleries that contains the tag `stockings` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' big breasts --page=3\nSearches for galleries that contains the tag `big breasts` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' small breasts --sort=popular\nSearches for galleries that contains the tag `small breasts`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
    },
    artist: {
        description: 'Searches nhentai for specified artist.',
        examples: [
            ' hiten\nSearches for galleries from the artist `hiten` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' napata --page=3\nSearches for galleries from the artist `napata` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' alp --sort=popular\nSearches for galleries from the artist `alp`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
    },
    category: {
        description: 'Searches nhentai for specified category.',
        examples: [
            ' non-h\nSearches for galleries from the category `non-h` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' doujin --page=3\nSearches for galleries from the category `doujinshi` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' manga --sort=popular\nSearches for galleries from the category `manga`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
    },
    character: {
        description: 'Searches nhentai for specified character.',
        examples: [
            ' asuka langley soryu\nSearches for galleries that feature the character `asuka langley soryu` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' reimu hakurei --page=3\nSearches for galleries that feature the character `reimu hakurei` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' patchouli knowledge --sort=popular\nSearches for galleries that feature the character `patchouli knowledge`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
    },
    group: {
        description: 'Searches nhentai for specified group.',
        examples: [
            ' crimson comics\nSearches for galleries from the group `crimson comics` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' digital lover --page=3\nSearches for galleries from the group `digital lover` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' studio wallaby --sort=popular\nSearches for galleries from the group `studio wallaby`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
    },
    language: {
        description: 'Searches nhentai for specified language.',
        examples: [
            ' japanese\nSearches for galleries in `japanese` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' english --page=3\nSearches for galleries in `english` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' chinese --sort=popular\nSearches for galleries in `chinese`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
    },
    parody: {
        description: 'Searches nhentai for specified parody.',
        examples: [
            ' original\nSearches for `original` galleries and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' touhou project --page=3\nSearches for galleries that are parodies of `touhou project` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' kantai collection --sort=popular\nSearches for galleries that are parodies of `kantai collection`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
    },
};
const SORT_METHODS = Object.keys(Sort).map(s => Sort[s]);

export default class extends Command {
    constructor() {
        super('tag', {
            aliases: Object.keys(TAGS),
            subAliases: TAGS,
            nsfw: true,
            description: {
                usage: `<query> [--page=pagenum] [--sort=(${SORT_METHODS.join('/')})]`,
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
            const tag = message.util.parsed.alias as keyof typeof TAGS;

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
