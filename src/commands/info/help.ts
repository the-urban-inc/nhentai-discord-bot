import { Client, Command } from '@structures';
import {
    Collection,
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageEmbed,
    MessageSelectMenu,
} from 'discord.js';
import { SUPPORT_SERVER } from '@constants';

const CATEGORIES = {
    qna: ['❔', 'QNA'],
    asmr: ['👂', 'ASMR'],
    general: ['🧻', 'General'],
    images: ['🖼️', 'Images'],
    info: ['📄', 'Info'],
    misc: ['🛠️', 'Misc'],
    owner: ['🔒', 'Owner'],
};

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'help',
            description: 'Shows command list and FAQ (that nobody asks)',
            cooldown: 10000,
        });
    }

    update(category: string, owner: boolean) {
        const menu = new MessageSelectMenu().setCustomId('select');
        for (const c of Object.keys(CATEGORIES).reverse()) {
            if (c === 'owner' && owner) continue;
            menu.spliceOptions(0, 0, {
                label: CATEGORIES[c][1],
                value: c,
                emoji: CATEGORIES[c][0],
                default: c === category,
            });
        }
        return menu;
    }

    async exec(interaction: CommandInteraction) {
        const embeds = new Collection<string, MessageEmbed>();
        const qna = this.client.embeds
            .default()
            .setTitle('❔\u2000Questions Nobody Asked')
            .setDescription(
                `If you still have questions, [join the support server](${SUPPORT_SERVER}) and ask at #help`
            )
            .addField('Where are the n! commands?', 'Gone. Completely migrated to slash commands.')
            .addField(
                'How to view other pages or sort by popularity?',
                'After typing the query, press TAB once to input page number, press TAB one more time to input sort method. You can delete the page prompt if you only need to check out the first page. Page number is `1` and sort method is `recent` by default.'
            )
            .addField(
                'What do these buttons/select menus do?',
                '• `<<` / `>>` : Jumps to first/last page\n' +
                    '• `<` / `>` : Jumps to previous/next page⁽¹⁾\n' +
                    '• `x of y` : Jumps to specified page⁽¹⁾\n' +
                    '• `Sauce?` : Searches for image source using SauceNAO\n' +
                    '• `❤️` : Adds/Removes a doujin to/from favorites\n' +
                    '• `🔖` : Follows/Unfollows a tag/artist/parody/etc.\n' +
                    '• `🏴` : Blacklists a tag/artist/parody/etc.\n' +
                    '• `📥` : Downloads current doujin\n' +
                    "• `🗑` : Deletes bot message (and sometimes the user's message)⁽¹⁾\n" +
                    '• `Info View` / `Thumbnail View` / `Preview`: Toggles between text mode (with tags, artists, etc.)/big images mode/start reading the doujin. For `g` and `random` commands, `Thumbnail View` actually means start reading.⁽¹⁾\n' +
                    '(1) **Only the person who used the command can use these buttons/select menus**'
            )
            .addField(
                'What does following a tag/artist/parody/etc. mean?',
                "It's a feature that notifies you through DM when a new doujin with a tag you followed was released. You have to allow DM for it to work (obviously)."
            )
            .addField(
                'Why sometimes images are not showing?',
                'There are many possible reasons:\n' +
                    '• The media you are viewing contains a banned tag. The bot decided to omit the images to protect the server and itself. You can still unlock them by using the `danger` command. The bot owner will not take any responsibilities if this caused your server to get banned.\nRead [Discord Community Guidelines](https://discord.com/guidelines) for more info. TL;DR: loli, shota, guro.\n' +
                    '• You blacklisted one of the tags.\n' +
                    '• Discord AI deems this media unfit to display on Discord.\n' +
                    '• Image link is dead.\n' +
                    '• Your internet sucks.\n' +
                    'Note: It is obviously impossible to `Preview` a doujin with banned tags.'
            )
            .addField(
                'Why sometimes the bot just stopped working?',
                'Again, there are many possible reasons:\n' +
                    "• If it's only the buttons that didn't work, it could be that no buttons were clicked in that message for more than 3-5 minutes, so the bot just stopped listening.\n" +
                    '• The bot is hosted on Heroku, which restarts roughly every 24-hour.\n' +
                    '• A new update just came out and the bot needed to restart to apply new changes.'
            );
        embeds.set('qna', qna);
        for (const [category, commandNames] of this.client.categories.entries()) {
            if (category === 'owner' && interaction.user.id !== this.client.ownerID) continue;
            const commands = commandNames.map(c => this.client.commands.get(c).data);
            const embed = this.client.embeds
                .default()
                .setTitle(CATEGORIES[category].join('\u2000'))
                .setDescription(
                    'Note: All commands are slash commands, a feature Discord [introduced](https://blog.discord.com/slash-commands-are-here-8db0a385d9e6) not long ago. Commands with the `🔞` icon are NSFW commands and can only be used in NSFW channels.'
                )
                .addField(
                    'Commands',
                    commands.map(c => `${c.nsfw ? '`🔞`' : ''}__\`${c.name}\`__`).join(' ')
                )
                .addField(
                    'Confused?',
                    `Check out the QNA page!\nIf you still have questions, [join the support server](${SUPPORT_SERVER})`
                );
            embeds.set(category, embed);
        }
        const message = (await interaction.editReply({
            embeds: [embeds.get('general')],
            components: [
                new MessageActionRow().addComponents(
                    this.update('general', interaction.user.id === this.client.ownerID)
                ),
            ],
        })) as Message;
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000,
        });
        collector.on('collect', async i => {
            if (!i.isSelectMenu()) return;
            await i.deferUpdate();
            const category = i.values[0];
            await interaction.editReply({
                embeds: [embeds.get(category)],
                components: [
                    new MessageActionRow().addComponents(
                        this.update(category, interaction.user.id === this.client.ownerID)
                    ),
                ],
            });
        });
    }
}
