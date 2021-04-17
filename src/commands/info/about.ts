import { Command } from '@structures';
import { Message, version as DiscordVersion } from 'discord.js';
import { version as AkairoVersion } from 'discord-akairo';
import { User } from '@models/user';
import { PERMISSIONS } from '@utils/constants';
const { npm_package_version, npm_package_repository_url } = process.env;

export default class extends Command {
    constructor() {
        super('about', {
            aliases: ['about', 'stats'],
            description: {
                content:
                    'Shows detailed bot information. Currently, the number of users is incorrect.',
                examples: ['\nAbout me!'],
            },
        });
    }

    async exec(message: Message) {
        const [repo, owner] = npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        const embed = this.client.embeds
            .default()
            .setThumbnail(this.client.user.displayAvatarURL())
            .setTitle(`Hey ${message.author.username}, I'm ${this.client.user.tag}!`)
            .setDescription(this.client.config.description)
            .addField('❯ Discord', [
                `• **Guilds** : ${this.client.guilds.cache.size}`,
                `• **Channels** : ${this.client.channels.cache.size}`,
                `• **Users** : ${await User.estimatedDocumentCount({}).exec()}`,
                `• **Invite Link** : [Click here](${await this.client.generateInvite({
                    permissions: PERMISSIONS,
                })})`,
            ])
            .addField('❯ Technical', [
                `• **Uptime** : ${
                    this.client.uptime
                        ? this.client.util.formatMilliseconds(this.client.uptime)
                        : 'N/A'
                }`,
                `• **Version** : ${npm_package_version}`,
                `• **Memory Usage** : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
                    2
                )} MB`,
                `• **Node.js** : ${process.version}`,
                `• **Discord.js** : v${DiscordVersion}`,
                `• **Akairo** : v${AkairoVersion}`,
                `• **Github** : [Click here](https://github.com/${owner}/${repo.replace(
                    '.git',
                    ''
                )})`,
            ]);
        return message.channel.send({ embed });
    }
}
