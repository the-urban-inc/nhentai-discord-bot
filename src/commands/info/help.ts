import Command from '@inari/struct/bot/Command';
import { Argument } from 'discord-akairo';
import { Message } from 'discord.js';

const TITLE_LIST = {
    general: 'General',
    misc: 'Misc',
    info: 'Info',
    images: 'Images',
    owner: 'Owner',
    settings: 'Settings',
};

export default class extends Command {
    constructor() {
        super('help', {
            aliases: ['help', 'halp', 'h'],
            channel: 'guild',
            description: {
                content: 'Displays a list of commands or information about a command.',
                usage: '[command]',
                examples: ['', 'home', 'booru'],
            },
            args: [
                {
                    id: 'commandAlias',
                    type: Argument.product('commandAlias', 'lowercase'),
                },
            ],
        });
    }

    exec(message: Message, { commandAlias }: { commandAlias: [Command, string] }) {
        if (!commandAlias) return this.execCommandList(message);

        let command = commandAlias[0],
            alias = commandAlias[1].replace(/nsfw_/, '');

        const prefix =
            command.nsfw || !('nsfw' in command)
                ? this.client.config.settings.prefix.nsfw[0]
                : this.client.config.settings.prefix.sfw[0];

        if (command.areMultipleCommands) {
            if (command.subAliases) {
                command.id = Object.keys(command.subAliases).find(key =>
                    command.subAliases[key].includes(alias)
                );
                command.aliases = command.subAliases[command.id];
                command.description.content = command.description.content.replace('@', command.id);
            } else {
                command.id = alias;
                command.aliases = [];
                command.description.content = command.description.content.replace('@', alias);
            }
        }

        const clientPermissions = command.clientPermissions as string[];
        const userPermissions = command.userPermissions as string[];
        const examples = command.description.examples as string[];

        const embed = this.client.util
            .embed()
            .setTitle(
                `${prefix}${command.id} ${
                    command.description.usage ? command.description.usage : ''
                }`
            )
            .setDescription(command.description.content ?? 'No description specified.');

        if (clientPermissions)
            embed.addField(
                'Required Bot Permissions',
                clientPermissions.map(p => this.client.util.toTitleCase(p)).join(', ')
            );
        if (userPermissions)
            embed.addField(
                'Required User Permissions',
                userPermissions.map(p => this.client.util.toTitleCase(p)).join(', ')
            );
        if (command.channel) {
            embed.addField('Channel', command.channel === 'guild' ? 'Guild' : 'DM');
        }
        if (command.aliases.length > 1)
            embed.addField('Aliases', command.aliases.slice(1).join(', '));
        if (examples)
            embed.addField('Examples', examples.map(e => `${prefix}${command} ${e}`).join('\n'));
        return message.channel.send({ embed });
    }

    async execCommandList(message: Message) {
        const prefix = this.client.config.settings.prefix.nsfw[0];
        const display = this.client.embeds.richDisplay({ love: false }).addPage(
            this.client.util
                .embed()
                .setColor(0xffac33)
                .setTitle('Command List')
                .setDescription(`Use ${prefix}help [command] to see detailed info of a command`)
                .addField('Command Guide', [
                    '- <> : Required',
                    '- [] : Optional',
                    '- () : Choose 1',
                ])
                .addField('Emote Guide', [
                    '- ⏪ ⏩ : Jump to first/last page',
                    '- ◀ ▶ : Jump to previous/next page',
                    '- ↗️ : Jump to specified page',
                    '- ℹ️ : Jump to info page/View info of a doujin in doujin list view',
                    `- 🇦 ⏹ : Turn on/off auto browsing mode (add --auto to use this feature in ${prefix}g and ${prefix}random command)`,
                    '- ❤️ : Add/Remove a doujin to/from favorites',
                    '- 🔖 : Follow/Unfollow a tag/artist/parody/etc.',
                    '- 🏴 : Blacklist a tag/artist/parody/etc.',
                    '- 📥 : Download current doujin',
                    '- 🗑 : Delete bot message',
                ])
        );
        for (const [category, commands] of this.client.commandHandler.categories) {
            const title = TITLE_LIST[category as keyof typeof TITLE_LIST];
            const publicCommands =
                message.author.id === this.client.ownerID
                    ? commands
                    : commands.filter((c: Command) => !c.ownerOnly);
            const multipleCommands = publicCommands.filter((c: Command) => c.areMultipleCommands);
            const normalCommands = publicCommands.filter((c: Command) => !c.areMultipleCommands);
            if (normalCommands.size) {
                const embed = this.client.util.embed().setTitle(title);
                for (const [id, command] of normalCommands) {
                    const prefix =
                        command.nsfw || !('nsfw' in command)
                            ? this.client.config.settings.prefix.nsfw[0]
                            : this.client.config.settings.prefix.sfw[0];
                    const alias = command.aliases[0].replace(/nsfw_/, '');
                    embed.addField(
                        `${command.nsfw ? '`🔞` ' : ''}${prefix}${alias} ${
                            command.description.usage ? command.description.usage : ''
                        }`,
                        command.description.content ?? 'No description specified.'
                    );
                }
                display.addPage(embed);
            }
            if (multipleCommands.size) {
                for (const [id, command] of multipleCommands) {
                    const embed = this.client.util.embed().setTitle(title);
                    if (command.subAliases) {
                        Object.keys(command.subAliases).forEach(a => {
                            embed.addField(
                                `${command.nsfw ? '`🔞` ' : ''}${prefix}${a} ${
                                    command.description.usage ? command.description.usage : ''
                                }`,
                                command.description.content.replace('@', a)
                            );
                        });
                    } else {
                        command.aliases.forEach(a => {
                            a = a.replace(/nsfw_/, '');
                            embed.addField(
                                `${command.nsfw ? '`🔞` ' : ''}${prefix}${a} ${
                                    command.description.usage ? command.description.usage : ''
                                }`,
                                command.description.content.replace('@', a)
                            );
                        });
                    }
                    display.addPage(embed);
                }
            }
        }
        return display.run(
            this.client,
            message,
            await message.channel.send('Loading command list...'),
            '',
            {
                time: 180000,
            }
        );
    }
}
