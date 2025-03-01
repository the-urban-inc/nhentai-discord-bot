import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction, Message, ActionRowBuilder, StringSelectMenuBuilder, Component, ComponentType } from 'discord.js';
import { User } from '@database/models';

const LANGUAGE_ID = {
    japanese: '6346',
    english: '12227',
    chinese: '29963',
};

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'preferred-language',
            type: ApplicationCommandType.ChatInput,
            description: 'Configure preferred language settings',
            cooldown: 10000,
            nsfw: true,
        });
    }

    update(preferred: string[], query: boolean | null, follow: boolean | null) {
        const y = '✅',
            n = '❌';
        const settings = this.client.embeds
            .default()
            .setTitle('⚙️\u2000Preferred Languages')
            .addFields([
                {
                    name: 'Preferred Languages',
                    value: preferred.length
                        ? preferred.map(x => `\`${this.client.util.capitalize(x)}\``).join(', ')
                        : 'None',
                },
                {
                    name: 'Apply to queries?',
                    value: `${
                        query ? y : n
                    }\u2000**Query**\n• Filter preferred languages in your nhentai command calls (commands in the \`general\` category).\n• Note: **It only filters per nhentai page.**`,
                },
                {
                    name: 'Apply to notifier?',
                    value: `${
                        follow ? y : n
                    }\u2000**Notifier**\n• Filter preferred languages in your notifies (for more info visit the QNA tab of the \`help\` command).`,
                },
            ]);
        const language = new StringSelectMenuBuilder()
            .setCustomId('language')
            .setPlaceholder('⚙️\u2000Select language')
            .setMaxValues(3)
            .addOptions([
                {
                    label: 'English',
                    value: 'english',
                    emoji: '🇬🇧',
                    default: preferred.includes('english'),
                },
                {
                    label: 'Japanese',
                    value: 'japanese',
                    emoji: '🇯🇵',
                    default: preferred.includes('japanese'),
                },
                {
                    label: 'Chinese',
                    value: 'chinese',
                    emoji: '🇨🇳',
                    default: preferred.includes('chinese'),
                },
            ]);
        const toggle = new StringSelectMenuBuilder()
            .setCustomId('toggle')
            .setPlaceholder('⚙️\u2000Toggle settings')
            .addOptions([
                {
                    label: 'Queries',
                    value: 'query',
                    emoji: query ? n : y,
                },
                {
                    label: 'Notifier',
                    value: 'follow',
                    emoji: follow ? n : y,
                },
            ]);
        return {
            embeds: [settings],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(language),
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(toggle),
            ],
        };
    }

    async exec(interaction: CommandInteraction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        let user = await User.findOne({ userID: member.id }).exec();
        if (!user || !user.language) {
            user = await new User({
                userID: member.id,
                blacklists: [],
                language: {
                    preferred: [],
                    query: false,
                    follow: false,
                },
            }).save();
        }
        let { preferred, query, follow } = user.language;
        const message = (await interaction.editReply(
            this.update(
                preferred.map(p => p.name),
                query,
                follow
            )
        )) as Message;
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === member.id,
            time: 300000,
        });
        collector.on('collect', async i => {
            await i.deferUpdate();
            let updateLanguages = [],
                updateQuery = false,
                updateFollow = false;
            if (i.customId === 'language') {
                updateLanguages = i.values.map(v => {
                    return {
                        id: LANGUAGE_ID[v],
                        name: v,
                    };
                });
            }
            if (i.customId === 'toggle') {
                if (i.values.includes('query')) updateQuery = true;
                if (i.values.includes('follow')) updateFollow = true;
            }
            ({ preferred, query, follow } = await this.client.db.user.language(
                member.id,
                updateLanguages,
                updateQuery,
                updateFollow
            ));
            await interaction.editReply(
                this.update(
                    preferred.map(p => p.name),
                    query,
                    follow
                )
            );
        });
    }
}
