import { Command } from '@structures/Command';
import { Message, GuildMember } from 'discord.js';
import he from 'he';
import moment from 'moment';
import { User } from 'src/database/models/user';
import { Server } from 'src/database/models/server';
import { Tag } from '@api/nhentai';
import { ICON, BANNED_TAGS, BLOCKED_MESSAGE } from '@utils/constants';
import { Blacklist } from 'src/database/models/tag';

export default class extends Command {
    constructor() {
        super('favorites', {
            aliases: ['favorites', 'favourites'],
            channel: 'guild',
            nsfw: true,
            description: {
                content:
                    "Check your (or your buddy's) favorites list.\nTo add a doujin to your favorites list, react with `❤️`",
                usage: '[user]',
                examples: ['', '@Inari#7217'],
            },
            args: [
                {
                    id: 'member',
                    type: 'member',
                },
            ],
        });
    }

    danger = true;
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
            const server = await Server.findOne({ serverID: message.guild.id }).exec();
            this.danger = server.settings.danger;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    async exec(message: Message, { member }: { member: GuildMember }) {
        try {
            member = member || message.member;
            const user = await User.findOne({
                userID: member.id,
            }).exec();
            if (!user) {
                return message.channel.send(this.client.embeds.info('Favorites list not found.'));
            } else {
                if (!user.favorites.length)
                    return message.channel.send(
                        this.client.embeds.info('Favorites list not found.')
                    );
                let msg = await message.channel.send(
                    'Fetching favorites... The longer your favorites list is, the more time you will have to wait...'
                );
                const display = this.client.embeds.richDisplay({ download: true });
                for (const code of user.favorites) {
                    const { gallery } = await this.client.nhentai.g(parseInt(code, 10));
                    const { info, rip } = this.client.embeds.displayGalleryInfo(
                        gallery,
                        this.danger,
                        this.blacklists
                    );
                    if (rip) this.warning = true;
                    display.addPage(info, gallery);
                }
                await display.run(this.client, message, await msg.edit('Done.'), '', {
                    idle: 300000,
                });

                if (!this.danger && this.warning) {
                    return this.client.embeds
                        .richDisplay({ image: true, removeRequest: false })
                        .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                        .useCustomFooters()
                        .run(this.client, message, await message.channel.send('Loading ...'));
                }
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
