const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const User = require('../../../models/user');

module.export = class LeaderboardCommand extends Command {
	constructor() {
		super('leaderboard', {
            category: 'general',
			aliases: ['leaderboard'],
			description: {
                content: 'Displays server leaderboard',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
		});
    }

	async exec(message) {
        let pervs = [], failed = false;
        for (const [key, member] of this.client.guilds.get(message.guild.id).members) {
            await User.findOne({
                userID: member.id
            }, async (err, user) => {
                if (err) {
                    failed = true;
                    return this.client.logger.error(err);
                }
                if (!user || !user.points) return;
                else {
                    pervs.push({
                        user: member.user,
                        points: user.points
                    });
                }
            });
        }
        pervs.sort((a, b) => b.points - a.points);
        const pos = pervs.findIndex((x) => x.user.id == message.author.id);
        if (!pervs.length) return message.channel.send(new MessageEmbed()
            .setTitle(`${message.guild.name}'s leaderboard`)
            .setThumbnail(message.guild.iconURL())
            .setDescription('Looks like nobody has any points. *cricket noises'));
        const display = this.client.embeds('display')
        for (let i = 0, j = pervs.length; i < j; i += 10) {
            let page = pervs.slice(i, i + 10);
            const embed = new MessageEmbed()
                .setTitle(`${message.guild.name}'s leaderboard`)
                .setThumbnail(message.guild.iconURL())
            page.forEach((perv, idx) => embed.addField(`[${idx + i + 1}]\u2000${perv.user.tag}`, `Total Score : ${perv.points}`, false));
            embed.setFooter(`Your guild placing stats : Rank [${pos + 1}]\u2000•\u2000Total Score : ${pervs[pos].points}`);
            display.addPage(embed);
        }
        return display.useCustomFooters().run(message, message, ['remove', 'love']);
    }
    
    calculateRank(points) {
        switch (true) {
            case (points < 1200): return ["Newbie", "#cccccc"];
            case (points < 1400): return ["Pupil", "#77ff77"];
            case (points < 1600): return ["Specialist", "#77ddbb"];
            case (points < 1900): return ["Expert", "#aaaaff"];
            case (points < 2100): return ["Candidate Master", "#ff88ff"];
            case (points < 2300): return ["Master", "#ffcc88"];
            case (points < 2400): return ["International Master", "#ffbb55"];
            case (points < 2600): return ["Grandmaster", "#ff7777"];
            case (points < 3000): return ["International Grandmaster", "#ff3333"];
            default: return ["Legendary Grandmaster", "#aa0000"];
        }
    }
};