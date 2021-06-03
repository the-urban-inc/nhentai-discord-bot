import { Command } from '@structures';
import { Message, GuildMember } from 'discord.js';
import { User } from '@models/user';
import { ICON } from '@utils/constants';
import moment from 'moment';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];

export default class extends Command {
    constructor() {
        super('profile', {
            aliases: ['profile'],
            cooldown: 10000,
            description: {
                content:
                    "Shows your (or your buddy's) profile.\nAdd --more to view favorite list, blacklist and recent calls (will not show up if the user has anonymous mode turned on).",
                usage: '[user]',
                examples: ['\nShows your own profile.', " @nhentai#7217\nShows nhentai's profile."],
            },
            error: {
                'No Result': {
                    message: 'User not found!',
                    example: `The user probably hasn't used any commands that record him/her into the database yet. If you are 100% sure otherwise, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
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
                return this.client.commandHandler.emitError(
                    new Error('No Result'),
                    message,
                    this
                );
            } else {
                const exp = user.points,
                    level = user.level,
                    next = this.client.db.XP.levelToEXP(level + 1);
                const progress = Math.floor((exp / next) * 100);
                const totalBar = '░░░░░░░░░░░░░░░░';
                const progressBar = '▒'; // ░░░░░
                const embed = this.client.embeds
                    .default()
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
                if (more && (user.favorites.length || (user.history.length && !user.anonymous))) {
                    const display = this.client.embeds.richDisplay({ love: false }).addPage(embed);

                    if (user.favorites.length) {
                        display.addPage(
                            this.client.embeds
                                .default()
                                .setTitle('Favorites')
                                .setThumbnail(member.user.displayAvatarURL())
                                .setDescription(user.favorites.map(x => `• ${x}`).join('\n'))
                        );
                    }

                    if (user.history.length && !user.anonymous) {
                        let embed = this.client.embeds
                            .default()
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
                        message, // await message.channel.send('Loading ...')
                        `> **Viewing profile • [** ${message.author.tag} **]**`,
                        {
                            collectorTimeout: 180000,
                        }
                    );
                }
                return message.channel.send(`> **Viewing profile • [** ${message.author.tag} **]**`, embed);
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
