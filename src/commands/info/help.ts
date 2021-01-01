import Command from '@inari/struct/bot/Command';
import { Argument, Category } from 'discord-akairo';
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

        const command = commandAlias[0],
            alias = commandAlias[1].replace(/nsfw_/, '');

        const prefix =
            command.nsfw || !('nsfw' in command)
                ? this.client.config.settings.prefix.nsfw[0]
                : this.client.config.settings.prefix.sfw[0];

        let {
            id,
            aliases,
            description: { content },
        } = command;

        if (command.areMultipleCommands) {
            if (command.subAliases) {
                id = Object.keys(command.subAliases).find(key =>
                    command.subAliases[key].includes(alias)
                );
                aliases = command.subAliases[id];
                content = content.replace('@', id);
            } else {
                id = alias;
                aliases = [alias];
                content = content.replace('@', alias);
            }
        }

        const clientPermissions = command.clientPermissions as string[];
        const userPermissions = command.userPermissions as string[];
        const examples = command.description.examples as string[];

        const embed = this.client.util
            .embed()
            .setTitle(`${prefix}${id} ${command.description.usage ?? ''}`)
            .setDescription(content ?? 'No description specified.');

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
        if (aliases && aliases.length > 1) embed.addField('Aliases', aliases.slice(1).join(', '));
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
                .setDescription(
                    `Use ${prefix}help [command] for more help. E.g: ${prefix}help g\nHover over commands for info.`
                )
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
                    ? commands.filter((c: Command) => !c.isConditionalorRegexCommand)
                    : (commands.filter(
                          (c: Command) => !c.ownerOnly && !c.isConditionalorRegexCommand
                      ) as Category<string, Command>);
            const embed = this.client.util.embed().setTitle(title);
            let cmds = [];
            publicCommands
                .sort((a: Command, b: Command) =>
                    a.areMultipleCommands === b.areMultipleCommands
                        ? 0
                        : a.areMultipleCommands
                        ? 1
                        : -1
                )
                .forEach((c: Command) => {
                    if (c.areMultipleCommands) {
                        const subCmds = c.subAliases ? Object.keys(c.subAliases) : c.aliases;
                        cmds.push({
                            id: `${c.nsfw ? '🔞 ' : ''}${c.id}`,
                            desc: c.description.content
                                ? `${c.description.content}\nwhere @ is one of [${subCmds
                                      .map(c => c.replace(/nsfw_/, ''))
                                      .join(', ')}]`
                                : 'No description specified',
                        });
                    } else {
                        cmds.push({
                            id: `${c.nsfw ? '🔞 ' : ''}${c.id}`,
                            desc: c.description.content ?? 'No description specified',
                        });
                    }
                });
            embed.setDescription(
                cmds
                    .map(
                        c =>
                            `[\`${c.id}\`](https://nhentai.net "${
                                typeof c.desc !== 'string' ? c.desc.join('\n') : c.desc
                            }")`
                    )
                    .join(' ')
            );
            display.addPage(embed);
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
