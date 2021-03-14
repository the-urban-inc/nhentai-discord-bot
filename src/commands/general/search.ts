import { Command } from '@structures';
import { Message } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { Sort } from '@api/nhentai';
import { BLOCKED_MESSAGE } from '@utils/constants';
const SORT_METHODS = Object.keys(Sort).map(s => Sort[s]);

export default class extends Command {
    constructor() {
        super('search', {
            aliases: ['search'],
            nsfw: true,
            cooldown: 20000,
            description: {
                content: `Searches nhentai for given query.`,
                usage: `<text> [--page=pagenum] [--sort=(${SORT_METHODS.join('/')})]`,
                examples: [
                    ' #110631\nDirectly views info of `110631`.',
                    ' 110631\nAlso works without `#`.',
                    ` tag:"big breasts" pages:>15 -milf\nSearches for galleries with over 15 pages that contain tag \`big breasts\` but without tag \`milf\` and displays them as a list of thumbnails.`,
                    ` naruto uploaded:7d\nSearches for galleries with titles containing the keyword \`naruto\` and were uploaded within 7 days and displays them as a list of thumbnails.`,
                ],
                additionalInfo:
                    '• You can search for multiple terms at the same time, and this will return only galleries that contain both terms. For example, `anal tanlines` finds all galleries that contain both `anal` and `tanlines`.\n' +
                    '• You can exclude terms by prefixing them with `-`. For example, `anal tanlines -yaoi` matches all galleries matching `anal` and `tanlines` but not `yaoi`.\n' +
                    '• Exact searches can be performed by wrapping terms in double quotes. For example, `"big breasts"` only matches galleries with "big breasts" somewhere in the title or in tags.\n' +
                    '• These can be combined with tag namespaces for finer control over the query: `parodies:railgun -tag:"big breasts"`.\n' +
                    '• You can search for galleries with a specific number of pages with `pages:20`, or with a page range: `pages:>20 pages:<=30`.\n' +
                    '• You can search for galleries uploaded within some timeframe with `uploaded:20d`. Valid units are `h`, `d`, `w`, `m`, `y`. You can use ranges as well: `uploaded:>20d uploaded:<30d`.',
            },
            error: {
                'Invalid Query': {
                    message: 'Please provide a search query!',
                    example:
                        ' ane naru mono\nto search for galleries with titles contain `ane naru mono`.',
                },
                'No Result': {
                    message: 'No result found!',
                    example: 'Try again with a different query.',
                },
                'Invalid Page Index': {
                    message: 'Please provide a page index within range!',
                    example:
                        ' naruto uploaded:7d --page=3\nto search for galleries with titles containing the keyword `naruto` and were uploaded within 7 days and display them as a list of thumbnails starting from the 2nd page.',
                },
                'Invalid Sort Method': {
                    message: `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                        s => `\`${s}\``
                    ).join(', ')}.`,
                    example:
                        ' tag:"big breasts" pages:>15 -milf --sort=popular\nto search for galleries with over 15 pages that contain tag `big breasts` but without tag `milf` and display them as a list of thumbnails, sorted by popularity.',
                },
            },
            args: [
                {
                    id: 'text',
                    type: 'string',
                    match: 'rest',
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

    danger = false;
    warning = false;
    blacklists: Blacklist[] = [];

    async before(message: Message) {
        try {
            let user = await User.findOne({ userID: message.author.id }).exec();
            if (!user) {
                user = await new User({
                    blacklists: [],
                }).save();
            }
            this.blacklists = user.blacklists;
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
            if (!text) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(
                    new Error('Invalid Query'),
                    message,
                    this
                );
            }

            let pageNum = parseInt(page, 10);
            if (!pageNum || isNaN(pageNum) || pageNum < 1) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(
                    new Error('Invalid Page Index'),
                    message,
                    this
                );
            }

            if (/^\d+$/.test(text.replace('#', ''))) {
                const command = this.client.commandHandler.findCommand('g');
                await command.before(message);
                return command.exec(message, { code: text.replace('#', ''), page: '1' });
            }

            if (!Object.values(Sort).includes(sort as Sort)) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(
                    new Error('Invalid Sort Method'),
                    message,
                    this
                );
            }

            const data =
                sort === 'recent'
                    ? await this.client.nhentai
                          .search(text, pageNum)
                          .catch(err => this.client.logger.error(err.message))
                    : await this.client.nhentai
                          .search(text, pageNum, sort as Sort)
                          .catch(err => this.client.logger.error(err.message));
            if (!data) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const { result, num_pages, num_results } = data;
            if (!result.length) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }

            if (pageNum > num_pages) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(
                    new Error('Invalid Page Index'),
                    message,
                    this
                );
            }

            const { displayList: displaySearch, rip } = this.client.embeds.displayGalleryList(
                result,
                this.danger,
                this.blacklists,
                {
                    page: pageNum,
                    num_pages,
                    num_results,
                }
            );
            if (rip) this.warning = true;
            await displaySearch.run(
                this.client,
                message,
                message, // await message.channel.send('Searching ...'),
                `> **Searching for galleries • [** ${message.author.tag} **]**`,
                {
                    idle: 300000,
                    danger: this.danger,
                }
            );

            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ removeOnly: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(
                        this.client,
                        message,
                        message, // await message.channel.send('Loading ...'),
                        '',
                        {
                            time: 300000,
                        }
                    );
            }
        } catch (err) {
            this.client.logger.error(err.message);
        }
    }
}
