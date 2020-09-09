import Command from '@nhentai/struct/bot/Command';
import { Argument } from 'discord-akairo';
import { Message } from 'discord.js';
const { PREFIX } = process.env;

const SPECIAL_COMMANDS = {
    tag: 'Searches nhentai for specifed @',
};

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
            category: 'info',
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
            alias = commandAlias[1];
        if (Object.keys(SPECIAL_COMMANDS).includes(command.id) && command.aliases.includes(alias)) {
            command.description.content = SPECIAL_COMMANDS[command.id].replace('@', alias);
            command.id = alias;
            command.aliases = [];
        }

        const clientPermissions = command.clientPermissions as string[];
        const userPermissions = command.userPermissions as string[];
        const examples = command.description.examples as string[];

        const embed = this.client.util
            .embed()
            .setTitle(
                `${PREFIX}${command.id} ${
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
            embed.addField('Examples', examples.map(e => `${PREFIX}${command} ${e}`).join('\n'));
        return message.channel.send({ embed });
    }

    async execCommandList(message: Message) {
        const display = this.client.embeds.richDisplay({ love: false }).addPage(
            this.client.util
                .embed()
                .setColor(0xffac33)
                .setTitle('Command List')
                .setDescription(`Use ${PREFIX}help [command] to see detailed info of a command`)
                .addField('Command Guide', [
                    '- <> : Required',
                    '- [] : Optional',
                    '- () : Choose 1',
                ])
                .addField('Emote Guide', [
                    '- ⏪ ⏩ : Jump to first/last page',
                    '- ◀ ▶ : Jump to previous/next page',
                    '- ↗️ : Jump to specified page',
                    '- ℹ️ : Jump to info page',
                    `- 🇦 ⏹ : Turn on/off auto browsing mode (add --auto to use this feature in ${PREFIX}g and ${PREFIX}random command)`,
                    '- ❤️ : Add/Remove a doujin to/from favorites',
                    '- 🏴 : Blacklist a tag/artist/parody/etc.',
                    '- 🗑 : Delete bot message',
                ])
        );
        for (const [category, commands] of this.client.commandHandler.categories) {
            const title = TITLE_LIST[category as keyof typeof TITLE_LIST];
            const publicCommands =
                message.author.id === this.client.ownerID
                    ? commands
                    : commands.filter(c => !c.ownerOnly);
            const embed = this.client.util.embed().setTitle(title);
            publicCommands.forEach(command => {
                if (Object.keys(SPECIAL_COMMANDS).includes(command.id)) {
                    command.aliases.forEach(a => {
                        embed.addField(
                            `${PREFIX}${a} ${
                                command.description.usage ? command.description.usage : ''
                            }`,
                            `Searches nhentai for specified ${a}.`
                        );
                    });
                } else {
                    embed.addField(
                        `${PREFIX}${command.aliases[0]} ${
                            command.description.usage ? command.description.usage : ''
                        }`,
                        command.description.content ?? 'No description specified.'
                    );
                }
            });
            display.addPage(embed);
        }
        return display.run(
            this.client,
            message,
            await message.channel.send('Loading command list...'),
            {
                time: 300000,
            }
        );
    }
}
