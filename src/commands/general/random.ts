import { Command } from '@structures';
import { Message } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { BLOCKED_MESSAGE } from '@utils/constants';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];

export default class extends Command {
    constructor() {
        super('random', {
            aliases: ['random'],
            nsfw: true,
            cooldown: 20000,
            description: {
                content: 'Shows a random gallery.',
                usage: '[--more] [--auto]',
                examples: [
                    '\nShows info of a random gallery.',
                    ' --more\nShows info of a random gallery, with the addition of similar galleries and comments made on the main site.',
                    ' --auto\nAdds the option of reading the gallery with auto mode, meaning nhentai will turn the pages for you after a set number of seconds (your choice).',
                ],
            },
            error: {
                'No Result': {
                    message: 'Failed to fetch a random gallery!',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
            },
            args: [
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
        { more, auto, dontLogErr }: { more?: boolean; auto?: boolean; dontLogErr?: boolean }
    ) {
        try {
            const result = await this.client.nhentai
                .random()
                .catch(err => this.client.logger.error(err.message));
            if (!result) {
                if (dontLogErr) return;
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }

            const { displayGallery, rip } = this.client.embeds.displayFullGallery(
                result.gallery,
                this.danger,
                auto,
                this.blacklists
            );
            if (rip) this.warning = true;
            if (this.danger || !rip) {
                await displayGallery.run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...'),
                    `> **Searching for random gallery • [** ${message.author.tag} **]**`,
                    {
                        collectorTimeout: 300000,
                    }
                );
            } else {
                await displayGallery.run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...')
                    `> **Searching for random gallery • [** ${message.author.tag} **]**`,
                    {
                        collectorTimeout: 300000,
                    }
                );
            }

            if (more) {
                const { related, comments } = result;

                const { displayList: displayRelated, rip } = this.client.embeds.displayGalleryList(
                    related,
                    this.danger,
                    this.blacklists
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
            this.client.logger.error(err.message);
        }
    }
}
