import Command from '@nhentai/struct/bot/Command';
import { Message, GuildMember } from 'discord.js';
import { User } from '@nhentai/models/user';
import { ICON } from '@nhentai/utils/constants';
import moment from 'moment';

export default class extends Command {
    constructor() {
        super('profile', {
            aliases: ['profile'],
            description: {
                content:
                    "Views someone's profile.\nAdd --more to view favorite list, blacklist and recent calls (will not show up if the user has anonymous mode turned on).",
                usage: '[user]',
                examples: ['', '@nhentai#7217'],
            },
            args: [
                {
                    id: 'member',
                    type: 'member',
                },
                {
                    id: 'more',
                    match: 'flag',
                    flag: ['-m', '--more'],
                },
            ],
        });
    }

    async exec(message: Message, { member, more }: { member: GuildMember; more: boolean }) {
        try {
            member = member || message.member;
            const user = await User.findOne({
                userID: member.id,
            }).exec();
            if (!user) {
                return message.channel.send(this.client.embeds.clientError('User not found.'));
            } else {
                const exp = user.points,
                    level = user.level,
                    next = this.client.db.XP.levelToEXP(level + 1);
                const progress = Math.floor((exp / next) * 100);
                const totalBar = '░░░░░░░░░░░░░░░░';
                const progressBar = '▒'; // ░░░░░
                const embed = this.client.util
                    .embed()
                    .setAuthor(`nhentai profile`, ICON, 'https://nhentai.net')
                    .setTitle(`${member.displayName} [${member.user.tag}]`)
                    .setColor(member.displayHexColor)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setDescription([
                        `**[${level}]** [${
                            progressBar.repeat((totalBar.length / 100) * progress) +
                            totalBar.substring((totalBar.length / 100) * progress + 1)
                        }] [${progress}%]\n`,
                        `• **Total EXP** : ${exp.toLocaleString()}`,
                        `• **Server Rank** : #${await this.client.db.XP.getServerRanking(message)}`,
                        `• **Global Rank** : #${await this.client.db.XP.getGlobalRanking(exp)}`,
                    ]);
                if (
                    more &&
                    (user.favorites.length || (user.history.length && !user.anonymous))
                ) {
                    const display = this.client.embeds.richDisplay({ love: false }).addPage(embed);

                    if (user.favorites.length) {
                        display.addPage(
                            this.client.util
                                .embed()
                                .setTitle('Favorites')
                                .setThumbnail(member.user.displayAvatarURL())
                                .setDescription(user.favorites.map(x => `• ${x}`).join('\n'))
                        );
                    }

                    if (user.history.length && !user.anonymous) {
                        let embed = this.client.util
                            .embed()
                            .setTitle('Recent calls')
                            .setThumbnail(member.user.displayAvatarURL());
                        let history = user.history.reverse().slice(0, 10);
                        history.forEach(x => {
                            const { id, type, name, date } = x;
                            const title = type === 'g' ? id : name;
                            embed.addField(`${title} [${type}]`, moment(date).fromNow());
                        });
                        display.addPage(embed);
                    }
                    return display.run(
                        this.client,
                        message,
                        await message.channel.send('Loading ...')
                    );
                }
                return message.channel.send(embed);
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
