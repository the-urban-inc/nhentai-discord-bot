import { Client, Command } from '@structures';
import { CommandInteraction, version as DiscordVersion } from 'discord.js';
import { User } from '@database/models';
import { PERMISSIONS } from '@constants';
const { npm_package_version, npm_package_repository_url } = process.env;

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'about',
            description: 'Shows detailed bot information',
        });
    }

    async exec(interaction: CommandInteraction) {
        const [repo, owner] = npm_package_repository_url
            .split('/')
            .filter(a => a)
            .reverse();
        return interaction.editReply({
            embeds: [
                this.client.embeds
                    .default()
                    .setThumbnail(this.client.user.displayAvatarURL())
                    .setTitle(`Hey ${interaction.user.username}, I'm ${this.client.user.tag}!`)
                    .setDescription(
                        "I'm an open source nhentai Discord bot powered by [TypeScript](https://www.typescriptlang.org/) with [discord.js](https://discord.js.org/#/)"
                    )
                    .addField(
                        '❯ Discord',
                        `• **Guilds** : ${this.client.guilds.cache.size}\n` +
                            `• **Channels** : ${this.client.channels.cache.size}\n` +
                            `• **Users** : ${await User.estimatedDocumentCount({}).exec()}\n` +
                            `• **Invite Link** : [Click here](${this.client.generateInvite({
                                scopes: ['bot', 'applications.commands'],
                                permissions: PERMISSIONS,
                            })})`
                    )
                    .addField(
                        '❯ Technical',
                        `• **Uptime** : ${
                            this.client.uptime
                                ? this.client.util.formatMilliseconds(this.client.uptime)
                                : 'N/A'
                        }\n` +
                            `• **Version** : ${npm_package_version}\n` +
                            `• **Memory Usage** : ${(
                                process.memoryUsage().heapUsed /
                                1024 /
                                1024
                            ).toFixed(2)} MB\n` +
                            `• **Node.js** : ${process.version}\n` +
                            `• **Discord.js** : v${DiscordVersion}\n` +
                            `• **Github** : [Click here](https://github.com/${owner}/${repo.replace(
                                '.git',
                                ''
                            )})`
                    ),
            ],
        });
    }
}
