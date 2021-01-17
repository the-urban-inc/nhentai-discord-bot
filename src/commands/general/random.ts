import { Command } from '@structures';
import { Message } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { Blacklist } from '@models/tag';
import { BLOCKED_MESSAGE } from '@utils/constants';

export default class extends Command {
    constructor() {
        super('random', {
            aliases: ['random'],
            nsfw: true,
            description: {
                content: 'Shows a random gallery.',
                usage: '[--more] [--auto]',
                examples: [
                    '\nShows info of a random gallery.',
                    ' --more\nShows info of a random gallery, with the addition of similar galleries and comments made on the main site.',
                    ' --auto\nAdds the option of reading the gallery with auto mode, meaning nhentai will turn the pages for you after a set number of seconds (your choice).',
                ],
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
            const result = await this.client.nhentai.random();
            if (!result) throw new Error("Couldn't find a random gallery.");

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
                    await message.channel.send('Searching ...'),
                    ''
                );
            } else {
                await displayGallery.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...')
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
                    await message.channel.send('Searching ...'),
                    '**More Like This**'
                );

                if (!comments.length) return;
                const displayComments = this.client.embeds.displayCommentList(comments);
                await displayComments.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '`💬` **Comments**'
                );
            }

            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ image: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Loading ...'));
            }
        } catch (err) {
            if (dontLogErr) return;
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.clientError(err));
        }
    }
}
