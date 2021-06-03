import { Command } from '@structures';
import { Message } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { ReactionHandler } from '@utils/pagination/ReactionHandler';
import { BLOCKED_MESSAGE } from '@utils/constants';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];
type ARGS = { page: string; dontLogErr?: boolean };

export default class extends Command {
    constructor() {
        super('home', {
            aliases: ['home', 'homepage'],
            nsfw: true,
            cooldown: 20000,
            description: {
                content:
                    "Shows nhentai homepage. Includes 'Popular Now' section for the first page.",
                usage: '[--page=pagenum]',
                examples: [
                    '\nShows a list of galleries (thumbnails) in the homepage.',
                    ' --page=3\nSame as above but for page 3.',
                ],
            },
            error: {
                'No Result': {
                    message: 'Failed to fetch homepage!',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
                'Invalid Page Index': {
                    message: 'Please provide a page index within range!',
                    example:
                        ' --page=3\nto show a list of galleries (thumbnails) in the 3rd page of homepage.',
                },
            },
            args: [
                {
                    id: 'page',
                    match: 'option',
                    flag: ['--page=', '-p='],
                    default: '1',
                },
            ],
        });
    }

    args: ARGS = null;
    message: Message = null;
    internalCall = false;
    currentHandler: ReactionHandler = null;
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

    movePage = async (currentHandler: ReactionHandler, diff: number) => {
        if (!this.args || !this.message) return false;
        this.args.page = (+this.args.page + diff).toString();
        this.args.dontLogErr = true;
        this.internalCall = true;
        this.currentHandler = currentHandler;
        return await this.exec(this.message, this.args);
    };

    async exec(message: Message, { page, dontLogErr }: ARGS) {
        try {
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

            const data = await this.client.nhentai
                .home(pageNum)
                .catch(err => this.client.logger.error(err.message));

            if (!data) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(new Error('No Result'), message, this);
                return false;
            }

            const { result, num_pages } = data;
            if (pageNum > num_pages) {
                if (dontLogErr) return false;
                this.client.commandHandler.emitError(
                    new Error('Invalid Page Index'),
                    message,
                    this
                );
                return false;
            }

            if (pageNum === 1) {
                const popularNow = data.popular_now;
                const { displayList: displayPopular, rip } = this.client.embeds.displayGalleryList(
                    popularNow,
                    this.danger,
                    this.blacklists,
                    {
                        page: pageNum,
                        num_pages,
                    }
                );
                if (rip) this.warning = true;
                await displayPopular.run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...'),
                    '> `🔥` **Popular Now**',
                    {
                        idle: 300000,
                        danger: this.danger,
                    }
                );
            }

            const newUploads = result;
            const { displayList: displayNew, rip } = this.client.embeds.displayGalleryList(
                newUploads,
                this.danger,
                this.blacklists,
                {
                    page: pageNum,
                    num_pages,
                    caller: 'home'
                }
            );
            if (rip) this.warning = true;
            if (this.internalCall && this.currentHandler) {
                this.currentHandler.display.pages = displayNew.pages;
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
            const handler = await displayNew.run(
                this.client,
                message,
                message, // await message.channel.send('Searching ...'),
                pageNum === 1 ? '> `🧻` **New Uploads**' : '',
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
            this.args = { page, dontLogErr };
            return true;
        } catch (err) {
            this.client.logger.error(err.message);
            return false;
        }
    }
}
