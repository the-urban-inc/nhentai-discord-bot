import { Client, Command } from '@structures';
import { CommandInteraction, User as DiscordUser } from 'discord.js';
import { User, Server, Blacklist } from '@database/models';
import moment from 'moment';
import { ICON } from '@constants';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'profile',
            type: 'CHAT_INPUT',
            description: "Shows your (or your friend's) profile",
            cooldown: 10000,
            nsfw: true,
            options: [
                {
                    name: 'user',
                    type: 'USER',
                    description: 'The user to search for',
                },
                {
                    name: 'more',
                    type: 'BOOLEAN',
                    description: 'Views more info',
                },
            ],
        });
    }

    anonymous = true;
    danger = false;
    warning = false;
    blacklists: Blacklist[] = [];

    async before(interaction: CommandInteraction) {
        try {
            let user = await User.findOne({ userID: interaction.user.id }).exec();
            if (!user) {
                user = await new User({
                    userID: interaction.user.id,
                    blacklists: [],
                    anonymous: true,
                }).save();
            }
            this.blacklists = user.blacklists;
            this.anonymous = user.anonymous;
            let server = await Server.findOne({ serverID: interaction.user.id }).exec();
            if (!server) {
                server = await new Server({
                    serverID: interaction.user.id,
                    settings: { danger: false },
                }).save();
            }
            this.danger = server.settings.danger;
            this.warning = false;
        } catch (err) {
            this.client.logger.error(err);
            throw new Error(`Database error: ${err.message}`);
        }
    }

    async exec(interaction: CommandInteraction) {
        await this.before(interaction);
        const u = (interaction.options.get('user')?.user as DiscordUser) ?? interaction.user;
        const more = interaction.options.get('more')?.value as boolean;
        const member = await interaction.guild.members.fetch(u.id);
        const user = await User.findOne({
            userID: member.id,
        }).exec();
        if (!user) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setAuthor({
                            name: `nhentai profile`,
                            iconURL: ICON,
                            url: 'https://nhentai.net',
                        })
                        .setTitle(`${member.displayName} [${member.user.tag}]`)
                        .setColor(member.displayHexColor)
                        .setThumbnail(member.user.displayAvatarURL())
                        .setDescription(`This user had no activity`),
                ],
            });
        }
        const exp = user.points,
            level = user.level,
            next = this.client.db.xp.levelToEXP(level + 1);
        const progress = Math.floor((exp / next) * 100);
        const totalBar = '░░░░░░░░░░░░░░░░';
        const progressBar = '▒'; // ░░░░░
        const embed = this.client.embeds
            .default()
            .setAuthor({ name: `nhentai profile`, iconURL: ICON, url: 'https://nhentai.net' })
            .setTitle(
                member.displayName === member.user.username
                    ? member.user.tag
                    : `${member.displayName} [${member.user.tag}]`
            )
            .setColor(member.displayHexColor)
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(
                `**[${level}]** [${
                    progressBar.repeat((totalBar.length / 100) * progress) +
                    totalBar.substring((totalBar.length / 100) * progress + 1)
                }] [${progress}%]\n\n` +
                    `• **Total EXP** : ${exp.toLocaleString()}\n` +
                    `• **Server Rank** : #${await this.client.db.xp.getServerRanking(
                        member.id,
                        interaction.guild.id
                    )}\n` +
                    `• **Global Rank** : #${await this.client.db.xp.getGlobalRanking(exp)}`
            );
        if (more && (interaction.user.id === u.id || !user.anonymous)) {
            const display = this.client.embeds
                .paginator(this.client, {
                    collectorTimeout: 180000,
                })
                .addPage('thumbnail', { embed });

            if (user.favorites.length) {
                display.addPage('thumbnail', {
                    embed: this.client.embeds
                        .default()
                        .setTitle('Favorites')
                        .setThumbnail(member.user.displayAvatarURL())
                        .setDescription(this.client.util.gshorten(user.favorites.map(x => `\`${x}\``), '\u2000', 1024)),
                });
            }

            if (user.history.length) {
                let embed = this.client.embeds
                    .default()
                    .setTitle('Recent calls')
                    .setThumbnail(member.user.displayAvatarURL());
                const history = user.history.reverse().slice(0, 10).map(x => {
                    const { id, type, name, date } = x;
                    const title = type === 'g' ? id : name;
                    return `[\`${type}\`] **\`${title}\`** (<t:${moment(date).unix()}:R>)`
                });
                embed.setDescription(history.join('\n'));
                display.addPage('thumbnail', { embed });
            }
            return display.run(interaction, `> **Viewing profile of** **\`${u.tag}\`**`);
        }
        return interaction.editReply({
            content: `> **Viewing profile of** **\`${u.tag}\`**`,
            embeds: [embed],
        });
    }
}
