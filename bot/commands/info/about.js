const { Command } = require('discord-akairo');
const { MessageEmbed, version } = require('discord.js');
const moment = require('moment');
const { npm_package_description, npm_package_version, npm_package_repository_url } = process.env;

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

	async exec(message) {
        const [repo, owner] = npm_package_repository_url.split('/').filter(a => a).reverse()
		const embed = new MessageEmbed()
            .setThumbnail(this.client.user.displayAvatarURL())
			.setTitle(`Hey ${message.author.username}, I'm ${this.client.user.tag}!`)
            .setDescription(`${npm_package_description}`)
            .addField('❯\u2000\Version', npm_package_version, true)
            .addField('❯\u2000\Users', this.client.users.cache.size, true)
            .addField('❯\u2000\Invite link', `[Click here](${
                await this.client.generateInvite([
                    'MANAGE_MESSAGES', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY', 'USE_EXTERNAL_EMOJIS'
                ])
            })`, true)
            .addField('❯\u2000\Uptime', `${moment.utc(this.client.uptime).format('DD')-1} day(s), ${moment.utc(this.client.uptime).format('HH:mm:ss')}`, true)
            .addField('❯\u2000\Github', `[Click here](https://github.com/${owner}/${repo})`, true)
            .addField('❯\u2000\Node.js version', process.version, true)
            .addField('❯\u2000\Memory usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
            .setFooter(`Made with Discord.js (v${version})`, 'https://vgy.me/ZlOMAx.png')
            .setTimestamp();
		return message.channel.send({ embed });
	}
};