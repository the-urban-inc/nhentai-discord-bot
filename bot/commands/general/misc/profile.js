const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const User = require('../../../models/user');

module.export = class ProfileCommand extends Command {
	constructor() {
		super('profile', {
            category: 'general',
			aliases: ['profile'],
			description: {
                content: 'Displays user profile',
                usage: '[user]',
                examples: ['', '@nhentai#7217']
            },
            args: [{
                id: 'member',
                type: 'member'
            }],
            cooldown: 3000
		});
    }

	async exec(message, { member }) {
        member = member || message.member;
        await User.findOne({
            userID: member.id
        }, async (err, user) => {
            if (err) {
				this.client.logger.error(err);
				return message.channel.send(this.client.embeds('error'));
			}
            if (!user) return message.channel.send(this.client.embeds('error', 'User profile not found.'));
            else {
                let exp = user.points; let [level, next] = this.client.extensions.calculateLevel(exp);
                let progress = Math.floor((exp / next) * 100); 
                let totalBar = '░░░░░░░░░░░░░░░░'; let progressBar = '▒'; // ░░░░░
                const embed = new MessageEmbed()
                    .setAuthor(`nhentai profile`, this.client.icon, 'https://nhentai.net')
                    .setTitle(`${member.displayName} [${member.user.tag}]`)
                    .setColor(member.displayHexColor)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp()
                    .setDescription(`**[${level}]** [${progressBar.repeat((totalBar.length / 100) * progress) + totalBar.substring((totalBar.length / 100) * progress + 1)}] [${progress}%]\n\n`)
                return message.channel.send(embed);
            }
		});
    }
};