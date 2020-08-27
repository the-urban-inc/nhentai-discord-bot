import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
const { PREFIX } = process.env;

const SpecialCommands = ['tag'];

const TitleList = {
    general: 'General',
    info: 'Info',
    images: 'Images',
    owner: 'Owner',
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
                    id: 'command',
                    type: 'commandAlias',
                },
            ],
        });
    }

    exec(message: Message, { command }: { command: Command }) {
        if (!command) return this.execCommandList(message);

        const clientPermissions = command.clientPermissions as string[];
        const userPermissions = command.userPermissions as string[];
        const examples = command.description.examples as string[];

        const embed = this.client.util
            .embed()
            .setTimestamp()
            .setTitle(
                `${PREFIX}${command} ${command.description.usage ? command.description.usage : ''}`
            )
            .setDescription(command.description.content ?? 'No description specified.');

        if (clientPermissions)
            embed.addField(
                'Required Bot Permissions',
                clientPermissions.map(p => `\`${this.client.util.toTitleCase(p)}\``).join(', ')
            );
        if (userPermissions)
            embed.addField(
                'Required User Permissions:',
                userPermissions.map(p => `\`${this.client.util.toTitleCase(p)}\``).join(', ')
            );
        if (command.aliases.length > 1)
            embed.addField(
                'Aliases',
                command.aliases
                    .slice(1)
                    .map(a => `\`${a}\``)
                    .join(', ')
            );
        if (examples)
            embed.addField('Examples', examples.map(e => `${PREFIX}${command} ${e}`).join('\n'));
        return message.channel.send({ embed });
    }

    async execCommandList(message: Message) {
        const display = this.client.embeds.richDisplay().addPage(
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
                    '- ❤️ : Add doujin to favourites',
                    '- 🗑 : Delete bot message',
                ])
        );
        for (const [category, commands] of this.client.commandHandler.categories) {
            const title = TitleList[category as keyof typeof TitleList];
            const publicCommands =
                message.author.id === this.client.ownerID
                    ? commands
                    : commands.filter(c => !c.ownerOnly);
            const embed = this.client.util.embed().setTitle(title);
            publicCommands.forEach(command => {
                if (SpecialCommands.includes(command.id)) {
                    command.aliases.forEach(a => {
                        embed.addField(
                            `${PREFIX}${a} ${
                                command.description.usage ? command.description.usage : ''
                            }`,
                            `Searches nhentai for specified ${a}`
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
