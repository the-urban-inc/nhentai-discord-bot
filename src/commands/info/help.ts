import { Command } from '@structures';
import { Argument, Category } from 'discord-akairo';
import { Message } from 'discord.js';

const TITLE_LIST = {
    general: 'General',
    misc: 'Misc',
    info: 'Info',
    asmr: 'ASMR',
    images: 'Images',
    owner: 'Owner',
    settings: 'Settings',
};

export default class extends Command {
    constructor() {
        super('help', {
            aliases: ['help', 'halp', 'h'],
            description: {
                content: 'Shows a list of commands or information about a command.',
                usage: '[command]',
                examples: [
                    '\nShows a list of commands (after the first page).',
                    ' home\nShows information about `home` command.',
                ],
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
            description: { content, examples, additionalInfo },
            cooldown,
        } = command;
        if (command.areMultipleCommands) {
            id = Object.keys(command.subAliases).find(
                key => key === alias || command.subAliases[key].aliases?.includes(alias)
            );
            aliases = command.subAliases[id].aliases ?? [alias];
            content = command.subAliases[id].description;
            examples = command.subAliases[id].examples;
            additionalInfo = command.subAliases[id].additionalInfo;
        }

        const clientPermissions = command.clientPermissions as string[];
        const userPermissions = command.userPermissions as string[];

        const embed = this.client.embeds
            .default()
            .setTitle(`${prefix}${id}`)
            .setDescription(`\`\`\`${content ?? 'No description specified.'}\`\`\``);

        embed.addField('Usage', `${prefix}${id} ${command.description.usage ?? ''}`);

        if (examples)
            embed.addField(
                'Examples',
                examples
                    .map((e: string) => {
                        const [example = '', description = ''] = e
                            .replace('\n', '\x01')
                            .split('\x01');
                        return `• \`${prefix}${id}${example}\`\n${description}`;
                    })
                    .join('\n')
            );

        if (clientPermissions)
            embed.addField(
                'Required Bot Permissions',
                clientPermissions.map(p => this.client.util.toTitleCase(p)).join(', '),
                true
            );

        if (userPermissions)
            embed.addField(
                'Required User Permissions',
                userPermissions.map(p => this.client.util.toTitleCase(p)).join(', '),
                true
            );

        if (aliases && aliases.length > 1)
            embed.addField('Aliases', aliases.slice(1).join(', '), true);

        if (cooldown) embed.addField('Cooldown', `${cooldown / 1000} seconds`, true);

        if (additionalInfo) embed.addField('More', additionalInfo);

        return message.channel.send({ embed });
    }

    async execCommandList(message: Message) {
        const prefix = this.client.config.settings.prefix.nsfw[0];
        const prefixList = this.client.commandHandler.splitPrefix.get(message.guild.id);
        const display = this.client.embeds.richDisplay({ love: false }).setInfoPage(
            this.client.embeds
                .default()
                .setTitle('Command List')
                .setDescription(
                    `Use \`${prefix}help [command]\` for more help. E.g: \`${prefix}help g\`.\nCommands with the \`🔞\` icon are NSFW commands and can only be used in NSFW channels with NSFW prefix(es) [${prefixList.nsfw
                        .map(p => `\`${p}\``)
                        .join(
                            ', '
                        )}].\nCommands in the Images category that isn't NSFW can only be used SFW prefix(es) [${prefixList.sfw
                        .map(p => `\`${p}\``)
                        .join(', ')}].\nOther commands can be used with both types of prefix.`
                )
                .addField('Command Guide', [
                    'While searching for command help, you might come across theses symbols `<>`, `[]` or `()` in the help message. They mean:',
                    '• <> : Required',
                    '• [] : Optional',
                    '• () : Choose 1',
                    `However, you don't need to type \`<>\` when you use the command. E.g   : \`${prefix}g <code> [--more] [--auto] [--page=pagenum]\` can be used like \`${prefix}g 177013\`, \`${prefix}g 177013 --more\`, \`${prefix}g 177013 --more --auto\`, etc.`,
                ])
                .addField('Emote Guide', [
                    'Use these reactions to navigate between pages:',
                    '• ⏪ ⏩ : Jumps to first/last page⁽¹⁾',
                    '• ◀ ▶ : Jumps to previous/next page⁽¹⁾',
                    '• ↗️ : Jumps to specified page⁽¹⁾',
                    '• ℹ️ : Jumps to info page/Views info of a doujin in doujin list view/Searches for image source using SauceNAO⁽¹⁾',
                    `• 🇦 ⏹ : Turns on/off auto browsing mode (automatically browse pages) (add --auto to use this feature in ${prefix}g and ${prefix}random command)⁽¹⁾`,
                    '• ❤️ : Adds/Removes a doujin to/from favorites',
                    '• 🔖 : Follows/Unfollows a tag/artist/parody/etc.',
                    '• 🏴 : Blacklists a tag/artist/parody/etc.',
                    '• 📥 : Downloads current doujin',
                    "• 🗑 : Deletes bot message (and sometimes the user's message)⁽¹⁾",
                    '(1) **Only the person who used the command can use these emotes.**',
                ])
                .setFooter('Turn to next page for the actual command list.')
        );
        for (const [category, commands] of this.client.commandHandler.categories) {
            const title = TITLE_LIST[category as keyof typeof TITLE_LIST];
            if (title === 'Owner' && message.author.id !== this.client.ownerID) continue;
            const publicCommands =
                message.author.id === this.client.ownerID
                    ? commands.filter((c: Command) => !c.isConditionalorRegexCommand)
                    : (commands.filter(
                          (c: Command) => !c.ownerOnly && !c.isConditionalorRegexCommand
                      ) as Category<string, Command>);
            const embed = this.client.embeds.default().setTitle(title);
            let cmds: string[] = [];
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
                        const subCmds = c.areMultipleCommands
                            ? Object.keys(c.subAliases)
                            : c.aliases;
                        cmds = cmds.concat(
                            subCmds.map(
                                sc => `${c.nsfw ? '`🔞`' : ''}__\`${sc.replace(/nsfw_/, '')}\`__`
                            )
                        );
                        cmds.push(cmds.pop() + '\n\n');
                    } else {
                        cmds.push(`${c.nsfw ? '`🔞`' : ''}__\`${c.id}\`__`);
                    }
                });
            embed.setDescription(cmds.join(' '));
            display.addPage(embed);
        }
        return display.run(
            this.client,
            message,
            message, // await message.channel.send('Loading command list...'),
            '',
            {
                collectorTimeout: 180000,
            }
        );
    }
}
