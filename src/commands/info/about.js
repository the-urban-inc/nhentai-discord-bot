const { Command } = require('discord-akairo');
const { MessageEmbed, version } = require('discord.js');
const moment = require('moment');
const nhentai = require('../../../package');
const { INVITE, NHENTAI_GITHUB_REPO_USERNAME, NHENTAI_GITHUB_REPO_NAME } = process.env;
const source = NHENTAI_GITHUB_REPO_NAME && NHENTAI_GITHUB_REPO_USERNAME;

module.exports = class AboutCommand extends Command {
	constructor() {
		super('about', {
            category: 'info',
			aliases: ['about', 'info', 'information', 'stats'],
			description: {
                content: 'Responds with detailed bot information.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
		});
	}

	exec(message) {
		const embed = new MessageEmbed()
            .setThumbnail(this.client.user.displayAvatarURL())
			.setTitle(`Hey ${message.author.username}, I'm ${this.client.user.tag}!`)
            .setDescription(`${nhentai.description}`)
            .addField('❯\u2000\Version', nhentai.version, true)
            .addField('❯\u2000\Users', this.client.users.size, true)
            .addField('❯\u2000\Invite link', INVITE ? `[Click here](${INVITE})` : 'No invite link provided.', true)
            .addField('❯\u2000\Uptime', `${moment.utc(this.client.uptime).format('DD')-1} day(s), ${moment.utc(this.client.uptime).format('HH:mm:ss')}`, true)
            .addField('❯\u2000\Github', source ? `[Click here](https://github.com/${NHENTAI_GITHUB_REPO_USERNAME}/${NHENTAI_GITHUB_REPO_NAME})` : 'N/A', true)
            .addField('❯\u2000\Node.js version', process.version, true)
            .addField('❯\u2000\Memory usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
            .setFooter(`Made with Discord.js (v${version})`, 'https://vgy.me/ZlOMAx.png')
            .setTimestamp();
		return message.channel.send({ embed });
	}
};