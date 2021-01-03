import { Command } from '@structures/Command';
import { Message } from 'discord.js';
import { User } from 'src/database/models/user';
import { Server } from 'src/database/models/server';
import { Blacklist } from 'src/database/models/tag';
import { BLOCKED_MESSAGE } from '@utils/constants';

export default class extends Command {
    constructor() {
        super('home', {
            aliases: ['home', 'homepage'],
            channel: 'guild',
            nsfw: true,
            description: {
                content: 'nhentai homepage.',
                usage: '[--page=pagenum]',
                examples: ['', '-p=3'],
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

    async exec(message: Message, { page, dontLogErr }: { page: string; dontLogErr?: boolean }) {
        try {
            let pageNum = parseInt(page, 10);
            const data = await this.client.nhentai.home(pageNum);
            if (!data) throw new Error('Unable to parse homepage.');
            const { result, num_pages } = data;
            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > num_pages)
                throw new RangeError('Page number is not an integer or is out of range.');

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
                    await message.channel.send('Searching ...'),
                    '`🔥` **Popular Now**',
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
                }
            );
            if (rip) this.warning = true;
            displayNew.run(
                this.client,
                message,
                await message.channel.send('Searching ...'),
                pageNum === 1 ? '`🧻` **New Uploads**' : '',
                {
                    idle: 300000,
                    danger: this.danger,
                }
            );

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
