import { Command } from '@structures';
import { Message } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { Sort } from '@api/nhentai';
import { ReactionHandler } from '@utils/pagination/ReactionHandler';
import { BLOCKED_MESSAGE } from '@utils/constants';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];
const SORT_METHODS = Object.keys(Sort).map(s => Sort[s]);
type ARGS = { text: string; page: string; sort: string; dontLogErr?: boolean };

const TAGS = {
    tag: {
        description: 'Searches nhentai for specified tag.',
        examples: [
            ' stockings\nSearches for galleries that contain the tag `stockings` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' big breasts --page=3\nSearches for galleries that contain the tag `big breasts` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' small breasts --sort=popular\nSearches for galleries that contain the tag `small breasts`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
        error: {
            'Invalid Query': {
                message: 'Please provide a tag name!',
                example:
                    ' stockings\nto search for galleries that contain the tag `stockings` and display the 1st result page as a list of thumbnails (sorted by upload date).',
            },
            'No Result': {
                message: 'No result found!',
                example: 'Try again with a different query.',
            },
            'Invalid Page Index': {
                message: 'Please provide a page index within range!',
                example:
                    ' big breasts --page=3\nto search for galleries that contain the tag `big breasts` and display the 3rd result page as a list of thumbnails (sorted by upload date).',
            },
            'Invalid Sort Method': {
                message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                    s => `\`${s}\``
                ).join(', ')}.`,
                example:
                    ' small breasts --sort=popular\nto search for galleries that contain the tag `small breasts`, sort them by popularity and display the 1st result page as a list of thumbnails.',
            },
        },
    },
    artist: {
        description: 'Searches nhentai for specified artist.',
        examples: [
            ' hiten\nSearches for galleries from the artist `hiten` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' napata --page=3\nSearches for galleries from the artist `napata` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' alp --sort=popular\nSearches for galleries from the artist `alp`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
        error: {
            'Invalid Query': {
                message: 'Please provide an artist name!',
                example:
                    ' hiten\nto search for galleries from the artist `hiten` and display the 1st result page as a list of thumbnails (sorted by upload date).',
            },
            'No Result': {
                message: 'No result found!',
                example: 'Try again with a different query.',
            },
            'Invalid Page Index': {
                message: 'Please provide a page index within range!',
                example:
                    ' napata --page=3\nto search for galleries from the artist `napata` and display the 3rd result page as a list of thumbnails (sorted by upload date).',
            },
            'Invalid Sort Method': {
                message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                    s => `\`${s}\``
                ).join(', ')}.`,
                example:
                    ' alp --sort=popular\nto search for galleries from the artist `alp`, sort them by popularity and display the 1st result page as a list of thumbnails.',
            },
        },
    },
    category: {
        description: 'Searches nhentai for specified category.',
        examples: [
            ' non-h\nSearches for galleries from the category `non-h` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' doujinshi --page=3\nSearches for galleries from the category `doujinshi` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' manga --sort=popular\nSearches for galleries from the category `manga`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
        error: {
            'Invalid Query': {
                message: 'Please provide a category name!',
                example:
                    ' non-h\nto search for galleries from the category `non-h` and display the 1st result page as a list of thumbnails (sorted by upload date).',
            },
            'No Result': {
                message: 'No result found!',
                example: 'Try again with a different query.',
            },
            'Invalid Page Index': {
                message: 'Please provide a page index within range!',
                example:
                    ' doujinshi --page=3\nto search for galleries from the category `doujinshi` and display the 3rd result page as a list of thumbnails (sorted by upload date).',
            },
            'Invalid Sort Method': {
                message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                    s => `\`${s}\``
                ).join(', ')}.`,
                example:
                    ' manga --sort=popular\nto search for galleries from the category `manga`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
            },
        },
    },
    character: {
        description: 'Searches nhentai for specified character.',
        examples: [
            ' asuka langley soryu\nSearches for galleries that feature the character `asuka langley soryu` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' reimu hakurei --page=3\nSearches for galleries that feature the character `reimu hakurei` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' patchouli knowledge --sort=popular\nSearches for galleries that feature the character `patchouli knowledge`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
        error: {
            'Invalid Query': {
                message: 'Please provide a character name!',
                example:
                    ' asuka langley soryu\nto search for galleries that feature the character `asuka langley soryu` and display the 1st result page as a list of thumbnails (sorted by upload date).',
            },
            'No Result': {
                message: 'No result found!',
                example: 'Try again with a different query.',
            },
            'Invalid Page Index': {
                message: 'Please provide a page index within range!',
                example:
                    ' reimu hakurei --page=3\nto search for galleries that feature the character `reimu hakurei` and display the 3rd result page as a list of thumbnails (sorted by upload date).',
            },
            'Invalid Sort Method': {
                message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                    s => `\`${s}\``
                ).join(', ')}.`,
                example:
                    ' patchouli knowledge --sort=popular\nto search for galleries that feature the character `patchouli knowledge`, sort them by popularity and display the 1st result page as a list of thumbnails.',
            },
        },
    },
    group: {
        description: 'Searches nhentai for specified group.',
        examples: [
            ' crimson comics\nSearches for galleries from the group `crimson comics` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' digital lover --page=3\nSearches for galleries from the group `digital lover` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' studio wallaby --sort=popular\nSearches for galleries from the group `studio wallaby`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
        error: {
            'Invalid Query': {
                message: 'Please provide a group name!',
                example:
                    ' crimson comics\nto search for galleries from the group `crimson comics` and display the 1st result page as a list of thumbnails (sorted by upload date).',
            },
            'No Result': {
                message: 'No result found!',
                example: 'Try again with a different query.',
            },
            'Invalid Page Index': {
                message: 'Please provide a page index within range!',
                example:
                    ' digital lover --page=3\nto search for galleries from the group `digital lover` and display the 3rd result page as a list of thumbnails (sorted by upload date).',
            },
            'Invalid Sort Method': {
                message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                    s => `\`${s}\``
                ).join(', ')}.`,
                example:
                    ' studio wallaby --sort=popular\nto search for galleries from the group `studio wallaby`, sort them by popularity and display the 1st result page as a list of thumbnails.',
            },
        },
    },
    language: {
        description: 'Searches nhentai for specified language.',
        examples: [
            ' japanese\nSearches for galleries in `japanese` and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' english --page=3\nSearches for galleries in `english` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' chinese --sort=popular\nSearches for galleries in `chinese`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
        error: {
            'Invalid Query': {
                message: 'Please provide a language name!',
                example:
                    ' japanese\nto search for galleries in `japanese` and display the 1st result page as a list of thumbnails (sorted by upload date).',
            },
            'No Result': {
                message: 'No result found!',
                example: 'Try again with a different query.',
            },
            'Invalid Page Index': {
                message: 'Please provide a page index within range!',
                example:
                    ' english --page=3\nto search for galleries in `english` and display the 3rd result page as a list of thumbnails (sorted by upload date).',
            },
            'Invalid Sort Method': {
                message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                    s => `\`${s}\``
                ).join(', ')}.`,
                example:
                    ' chinese --sort=popular\nto search for galleries in `chinese`, sort them by popularity and display the 1st result page as a list of thumbnails.',
            },
        },
    },
    parody: {
        description: 'Searches nhentai for specified parody.',
        examples: [
            ' original\nSearches for `original` galleries and displays the 1st result page as a list of thumbnails (sorted by upload date).',
            ' touhou project --page=3\nSearches for galleries that are parodies of `touhou project` and displays the 3rd result page as a list of thumbnails (sorted by upload date).',
            ' kantai collection --sort=popular\nSearches for galleries that are parodies of `kantai collection`, sorts them by popularity and displays the 1st result page as a list of thumbnails.',
        ],
        error: {
            'Invalid Query': {
                message: 'Please provide a parody name!',
                example:
                    ' original\nto search for `original` galleries and display the 1st result page as a list of thumbnails (sorted by upload date).',
            },
            'No Result': {
                message: 'No result found!',
                example: 'Try again with a different query.',
            },
            'Invalid Page Index': {
                message: 'Please provide a page index within range!',
                example:
                    ' touhou project --page=3\nto search for galleries that are parodies of `touhou project` and display the 3rd result page as a list of thumbnails (sorted by upload date).',
            },
            'Invalid Sort Method': {
                message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                    s => `\`${s}\``
                ).join(', ')}.`,
                example:
                    ' kantai collection --sort=popular\nto search for galleries that are parodies of `kantai collection`, sort them by popularity and display the 1st result page as a list of thumbnails.',
            },
        },
    },
};

export default class extends Command {
    constructor() {
        super('tag', {
            aliases: Object.keys(TAGS),
            subAliases: TAGS,
            nsfw: true,
            cooldown: 20000,
            description: {
                usage: `<query> [--page=pagenum] [--sort=(${SORT_METHODS.join('/')})]`,
            },
            error: {
                'Parsing Failed': {
                    message: 'An error occurred while parsing command.',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
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

    args: ARGS = null;
    message: Message = null;
    internalCall = false;
    currentHandler: ReactionHandler = null;
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

    movePage = async (currentHandler: ReactionHandler, diff: number) => {
        if (!this.args || !this.message) return false;
        this.args.page = (+this.args.page + diff).toString();
        this.args.dontLogErr = true;
        this.internalCall = true;
        this.currentHandler = currentHandler;
        return await this.exec(this.message, this.args);
    };

    async exec(message: Message, { text, page, sort, dontLogErr }: ARGS) {
        try {
            const tag = message.util?.parsed?.alias as keyof typeof TAGS;
            if (!tag) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(new Error('Parsing Failed'), message, this);
                return false;
            }

            if (!text) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(new Error('Invalid Query'), message, this);
                return false;
            }

            let pageNum = parseInt(page, 10);
            if (!pageNum || isNaN(pageNum) || pageNum < 1) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(
                    new Error('Invalid Page Index'),
                    message,
                    this
                );
                return false;
            }

            if (!Object.values(Sort).includes(sort as Sort)) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(
                    new Error('Invalid Sort Method'),
                    message,
                    this
                );
                return false;
            }

            const data =
                sort === 'recent'
                    ? await this.client.nhentai[tag](
                          text.toLowerCase(),
                          pageNum
                      ).catch((err: Error) => this.client.logger.error(err.message))
                    : await this.client.nhentai[tag](
                          text.toLowerCase(),
                          pageNum,
                          sort as Sort
                      ).catch((err: Error) => this.client.logger.error(err.message));
            if (!data) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(new Error('No Result'), message, this);
                return false;
            }
            const { result, tag_id, num_pages, num_results } = data;
            if (!result.length) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(new Error('No Result'), message, this);
                return false;
            }

            if (pageNum > num_pages) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(
                    new Error('Invalid Page Index'),
                    message,
                    this
                );
                return false;
            }

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
                    caller: tag,
                    additional_options: { follow: true, blacklist: true },
                }
            );
            if (rip) this.warning = true;
            if (this.internalCall && this.currentHandler) {
                this.currentHandler.display.pages = displayList.pages;
                if (this.currentHandler.warning && !this.warning) {
                    await this.currentHandler.warning.stop();
                    if (!this.currentHandler.warning.message.deleted)
                        await this.currentHandler.warning.message.delete();
                    this.currentHandler.warning = null;
                } else if (!this.currentHandler.warning && this.warning) {
                    this.currentHandler.warning = await this.client.embeds
                        .richDisplay({ removeOnly: true, removeRequest: false })
                        .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                        .useCustomFooters()
                        .run(
                            this.client,
                            message,
                            message, // await message.channel.send('Loading ...'),
                            '',
                            {
                                collectorTimeout: 300000,
                            }
                        );
                }
                this.internalCall = false;
                return true;
            }
            const handler = await displayList.setInfo({ id, type: tag, name }).run(
                this.client,
                message,
                message, // await message.channel.send('Searching ...'),
                `> **Searching for ${tag} • [** ${message.author.tag} **]**`,
                {
                    collectorTimeout: 300000,
                    danger: this.danger,
                }
            );
            if (!this.danger && this.warning) {
                const warning = await this.client.embeds
                    .richDisplay({ removeOnly: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(
                        this.client,
                        message,
                        message, // await message.channel.send('Loading ...'),
                        '',
                        {
                            collectorTimeout: 300000,
                        }
                    );
                handler.warning = warning;
            }
            this.message = message;
            this.args = { text, page, sort, dontLogErr };
            return true;
        } catch (err) {
            this.client.logger.error(err.message);
            return false;
        }
    }
}
