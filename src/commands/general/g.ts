import { Command } from '@structures';
import { Message } from 'discord.js';
import he from 'he';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { BLOCKED_MESSAGE } from '@utils/constants';

export default class extends Command {
    constructor() {
        super('g', {
            aliases: ['g', 'gallery', 'read'],
            nsfw: true,
            cooldown: 20000,
            description: {
                content: 'Searches for a code on nhentai.',
                usage: '<code> [--more] [--auto] [--page=pagenum]',
                examples: [
                    ' 177013\nShows info of `177013`.',
                    ' 177013 --page=5\nImmediately starts reading `177013` at page 5.',
                    ' 265918 --more\nShows info of `265918`, with the addition of similar galleries and comments made on the main site.',
                    ' 315281 --auto\nAdds the option of reading `315281` with auto mode, meaning nhentai will turn the pages for you after a set number of seconds (your choice).',
                ],
            },
            error: {
                'Invalid Query': {
                    message: 'Please provide a valid code!',
                    example: ' 177013\nto show info of `177013`.',
                },
                'No Result': {
                    message: 'No gallery found!',
                    example: 'Try again with a different code.',
                },
                'Invalid Page Index': {
                    message: 'Please provide a page index within range!',
                    example: ' 177013 --page=5\nto immediately start reading `177013` at page 5.',
                },
            },
            args: [
                {
                    id: 'text',
                    type: 'string',
                    match: 'text',
                },
                {
                    id: 'more',
                    match: 'flag',
                    flag: ['-m', '--more'],
                },
                {
                    id: 'auto',
                    match: 'flag',
                    flag: ['-a', '--auto'],
                },
                {
                    id: 'page',
                    match: 'option',
                    flag: ['--page=', '-p='],
                    default: '1',
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
            more,
            auto,
            page,
            dontLogErr,
        }: { text: string; more?: boolean; auto?: boolean; page?: string; dontLogErr?: boolean }
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

            const codeNum = parseInt(text, 10);
            if (!codeNum || isNaN(codeNum)) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(
                    new Error('Invalid Query'),
                    message,
                    this
                );
            }

            const result = await this.client.nhentai
                .g(codeNum, more)
                .catch(err => this.client.logger.error(err.message));

            if (!result || !result.gallery) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }

            // points increase
            const min = 30,
                max = 50;
            const inc = Math.floor(Math.random() * (max - min)) + min;

            const pageNum = parseInt(page, 10);
            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > result.gallery.num_pages) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(
                    new Error('Invalid Page Index'),
                    message,
                    this
                );
            }

            const history = {
                id: result.gallery.id.toString(),
                type: 'g',
                name: he.decode(result.gallery.title.english),
                author: message.author.id,
                guild: message.guild.id,
                date: Date.now(),
            };

            if (message.guild && !this.anonymous) {
                await this.client.db.Server.history(message, history);
                await this.client.db.User.history(message.author, history);
                const leveledUp = await this.client.db.XP.save('add', 'exp', message, inc);
                if (leveledUp) {
                    message.channel
                        .send(
                            this.client.embeds
                                .info('Congratulations! You have leveled up!')
                                .setFooter(message.author.tag, message.author.displayAvatarURL())
                        )
                        .then(message => message.delete({ timeout: 10000 }));
                }
            }

            const { displayGallery, rip } = this.client.embeds.displayFullGallery(
                result.gallery,
                this.danger,
                auto,
                this.blacklists,
                'g'
            );
            if (rip) this.warning = true;
            if (this.danger || !rip) {
                await displayGallery.run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...'),
                    `> **Searching for gallery • [** ${message.author.tag} **]**`,
                    {
                        startPage: pageNum - 1,
                        collectorTimeout: 300000,
                    }
                );
            } else {
                await displayGallery.run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...')
                    `> **Searching for gallery • [** ${message.author.tag} **]**`,
                    {
                        collectorTimeout: 300000,
                    }
                );
            }

            if (more) {
                const { related, comments } = result;

                const { displayList: displayRelated, rip } = this.client.embeds.displayGalleryList(
                    related,
                    this.danger
                );
                if (rip) this.warning = true;
                await displayRelated.run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...'),
                    '> **More Like This**',
                    {
                        collectorTimeout: 300000,
                    }
                );

                if (!comments.length) return;
                const displayComments = this.client.embeds.displayCommentList(comments);
                await displayComments.run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...'),
                    '> `💬` **Comments**',
                    {
                        collectorTimeout: 300000,
                    }
                );
            }

            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ removeOnly: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(
                        this.client,
                        message,
                        message, // await message.channel.send('Loading ...')
                        '',
                        {
                            collectorTimeout: 300000,
                        }
                    );
            }
        } catch (err) {
            return this.client.logger.error(err.message);
        }
    }
}
