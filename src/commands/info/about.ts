import Command from '@nhentai/struct/bot/Command';
import { Message, version } from 'discord.js';
import moment from 'moment';
import { PERMISSIONS } from '@nhentai/utils/constants';
const { npm_package_description, npm_package_version, npm_package_repository_url } = process.env;

export default class extends Command {
    constructor() {
        super('about', {
            category: 'info',
            aliases: ['about', 'info', 'information', 'stats'],
            description: {
                content: 'Responds with detailed bot information.',
                usage: '',
                examples: [''],
            },
            cooldown: 3000,
        });
    }

    async exec(message: Message) {
        const [repo, owner] = npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        const embed = this.client.util
            .embed()
            .setThumbnail(this.client.user.displayAvatarURL())
            .setTitle(`Hey ${message.author.username}, I'm ${this.client.user.tag}!`)
            .setDescription(`${npm_package_description}`)
            .addField('❯\u2000Version', npm_package_version, true)
            .addField('❯\u2000Users', this.client.users.cache.size, true)
            .addField('❯\u2000Guilds', this.client.guilds.cache.size, true)
            .addField(
                '❯\u2000Invite link',
                `[Click here](${await this.client.generateInvite(PERMISSIONS)})`,
                true
            )
            .addField(
                '❯\u2000Uptime',
                `${moment.utc(this.client.uptime).format('DD')} day(s), ${moment
                    .utc(this.client.uptime)
                    .format('HH:mm:ss')}`,
                true
            )
            .addField('❯\u2000Github', `[Click here](https://github.com/${owner}/${repo})`, true)
            .addField('❯\u2000Node.js version', process.version, true)
            .addField(
                '❯\u2000Memory usage',
                `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
                true
            )
            .setFooter(`Made with Discord.js (v${version})`, 'https://vgy.me/ZlOMAx.png')
            .setTimestamp();
        return message.channel.send({ embed });
    }
}
