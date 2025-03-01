import { Client, Command } from '@structures';
import {
    ApplicationCommandType,
    CommandInteraction,
    Message,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits,
    Component,
    ComponentType,
} from 'discord.js';
import { User, Server } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'general-settings',
            type: ApplicationCommandType.ChatInput,
            description: 'Configure user (and server) settings',
            cooldown: 10000,
            nsfw: true,
        });
    }

    update(anonymous: boolean, danger: boolean | null, privateCommand: boolean | null) {
        const y = '✅',
            n = '❌';
        const settings = this.client.embeds
            .default()
            .setTitle('⚙️\u2000General Settings')
            .addFields([{
                name: 'User Settings',
                value: `${
                    anonymous ? y : n
                }\u2000**Anonymous**\n• Disallow logging command calls to the database (hiding your calls from the \`recent\` command).\n• You won't receive XP from \`g\` command.`
            }]);
        const menu = new StringSelectMenuBuilder()
            .setCustomId('select')
            .setPlaceholder('⚙️\u2000Toggle settings')
            .addOptions([
                {
                    label: 'Anonymous',
                    value: 'anon',
                    emoji: anonymous ? n : y,
                },
            ]);
        if (danger !== null && privateCommand !== null) {
            settings.addFields([{
                name: 'Server Settings',
                value: `${
                    danger ? y : n
                }\u2000**Danger**\n• Start showing images relating to banned content stated in [Discord Community Guidelines](https://discord.com/guidelines). The bot owner will not take responsibilities if this caused your server to get banned.\n` +
                `${
                    privateCommand ? y : n
                }\u2000**Private**\n• Hide ALL commands by default.`
            }]);
            menu.spliceOptions(1, 0, 
                new StringSelectMenuOptionBuilder()
                    .setLabel('Danger')
                    .setValue('danger')
                    .setEmoji(danger ? n : y),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Private')
                    .setValue('private')
                    .setEmoji(privateCommand ? n : y)
            );
        }
        return {
            embeds: [settings],
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
        };
    }

    async exec(interaction: CommandInteraction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        let user = await User.findOne({ userID: member.id }).exec();
        if (!user) {
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
        let anonymous = user.anonymous,
            danger = null, privateCommand = null;
        if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    serverID: interaction.guild.id,
                    settings: { danger: false, private: false },
                }).save();
            }
            danger = server.settings.danger;
            privateCommand = server.settings.private;
        }
        const message = (await interaction.editReply(
            this.update(anonymous, danger, privateCommand)
        )) as Message;
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === member.id,
            time: 300000,
        });
        collector.on('collect', async i => {
            await i.deferUpdate();
            if (i.values.includes('anon'))
                anonymous = await this.client.db.user.anonymous(member.id);
            if (i.values.includes('danger'))
                danger = await this.client.db.server.danger(interaction.guild.id);
            if (i.values.includes('private'))
                privateCommand = await this.client.db.server.private(interaction.guild.id);
            await interaction.editReply(this.update(anonymous, danger, privateCommand));
        });
    }
}
