import { Command } from '@structures';
import { Message, GuildMember } from 'discord.js';
import { User } from '@models/user';
import { Server } from '@models/server';
import { BLOCKED_MESSAGE } from '@utils/constants';
import { Blacklist } from '@models/tag';

export default class extends Command {
    constructor() {
        super('favorites', {
            aliases: ['favorites', 'favourites'],
            nsfw: true,
            cooldown: 30000,
            description: {
                content:
                    "Shows your (or your buddy's) favorites list.\nTo add a gallery to your favorites list, react with ❤️.",
                usage: '[user]',
                examples: [
                    '\nShows your own favorites list.',
                    " @nhentai#7217\nShows nhentai's favorites list.",
                ],
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
                return message.channel.send(
                    this.client.embeds
                        .default()
                        .setTitle('Favorites List')
                        .setDescription('You have no favorite gallery!')
                );
            } else {
                if (!user.favorites.length) {
                    return message.channel.send(
                        this.client.embeds
                            .default()
                            .setTitle('Favorites List')
                            .setDescription('You have no favorite gallery!')
                    );
                }
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
                await display.run(
                    this.client,
                    message,
                    await msg.edit('Done.'),
                    `> **Favorites List • [** ${message.author.tag} **]**\n> **Galleries are sorted by date added**`,
                    {
                        collectorTimeout: 300000,
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
                            message // await message.channel.send('Loading ...')
                        );
                }
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
