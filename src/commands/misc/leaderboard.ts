import { Client, Command, Paginator } from '@structures';
import { CommandInteraction, MessageEmbed, Snowflake } from 'discord.js';
import { Server } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'leaderboard',
            type: 'CHAT_INPUT',
            description: "Shows server's leaderboard.",
            cooldown: 10000,
        });
    }

    paginate(display: Paginator, members: { name: string; score: string }[], embed: MessageEmbed) {
        const page = display.pages.info.length,
            l = 10;
        for (
            let i = 0, member = members[i + page * l];
            i + page * l < members.length && i < l;
            i++, member = members[i + page * l]
        ) {
            embed.addField(`[${i + page * l + 1}] ${member.name}`, member.score);
        }
        display.addPage('info', { embed });
        if (members.length > (page + 1) * l) return this.paginate(display, members, embed);
        return display;
    }

    async exec(interaction: CommandInteraction) {
        const server = await Server.findOne({ serverID: interaction.guild.id }).exec();
        const pervs = Array.from(server.users, ([userID, user]) => ({
            id: userID,
            points: user.points,
            level: user.level,
        }));
        pervs.sort((a, b) => b.points - a.points);
        const pos = pervs.findIndex(x => x.id == interaction.user.id);
        if (!pervs.length)
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle(`🏆\u2000${interaction.guild.name}`)
                        .setThumbnail(interaction.guild.iconURL())
                        .setDescription('Looks like nobody has any points. *cricket noises'),
                ],
            });
        const display = this.client.embeds.paginator(this.client, {
            collectorTimeout: 180000,
        });
        const members = [];
        for (const perv of pervs) {
            let level = `**Level** : ${perv.level}`,
                score = `**Total Score** : ${perv.points}`;
            if (perv === pervs[pos]) (level = `__${level}__`), (score = `__${score}__`);
            members.push({
                name: `${(await this.client.users.fetch(perv.id as Snowflake)).tag}`,
                score: `${level}\u2000•\u2000${score}`,
            });
        }
        const embed = this.client.embeds
            .default()
            .setTitle(`${interaction.guild.name}`)
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({
                text: `Your guild placing stats : Rank [${pos + 1}]\u2000•\u2000Level : ${
                    pervs[pos]?.level ?? 0
                }\u2000•\u2000Total Score : ${pervs[pos]?.points ?? 0}`,
            });
        return this.paginate(display, members, embed).run(
            interaction,
            `> **Viewing server rankings**`
        );
    }
}
