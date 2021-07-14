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
        for (const [category, commandNames] of this.client.categories.entries()) {
            if (category === 'owner' && interaction.user.id !== this.client.ownerID) continue;
            const commands = commandNames.map(c => this.client.commandHandler.findCommand(c).data);
            const embed = this.client.embeds
                .default()
                .setTitle(CATEGORIES[category].join('\u2000'))
                .setDescription(
                    'Note: All commands are slash commands, a feature Discord [introduced](https://blog.discord.com/slash-commands-are-here-8db0a385d9e6) not long ago.'
                )
                .addField(
                    'Commands',
                    commands.map(c => `${c.nsfw ? '`🔞`' : ''}__\`${c.name}\`__`).join(' ')
                )
                .addField('Confused?', `[Join the support server](${SUPPORT_SERVER})`);
            embeds.set(category, embed);
        }
        const message = (await interaction.editReply({
            embeds: [embeds.get('general')],
            components: [new MessageActionRow().addComponents(this.update('general', interaction.user.id === this.client.ownerID))],
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
                components: [new MessageActionRow().addComponents(this.update(category, interaction.user.id === this.client.ownerID))],
            });
        });
    }
}
