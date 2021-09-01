import { Client, Command } from '@structures';
import {
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageSelectMenu,
} from 'discord.js';
import { User, Server } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'general-settings',
            type: 'CHAT_INPUT',
            description: 'Configure user (and server) settings',
            cooldown: 10000,
            nsfw: true,
        });
    }

    update(anonymous: boolean, danger: boolean | null, url: boolean | null) {
        const y = '✅',
            n = '❌';
        const settings = this.client.embeds
            .default()
            .setTitle('⚙️\u2000General Settings')
            .addField(
                'User Settings',
                `${
                    anonymous ? y : n
                }\u2000**Anonymous**\n• Disallow logging command calls to the database (hiding your calls from the \`recent\` command).\n• You won't receive XP from \`g\` command.`
            );
        const menu = new MessageSelectMenu()
            .setCustomId('select')
            .setPlaceholder('⚙️\u2000Toggle settings')
            .addOptions([
                {
                    label: 'Anonymous',
                    value: 'anon',
                    emoji: anonymous ? n : y,
                },
            ]);
        if (danger !== null) {
            settings.addField(
                'Server Settings',
                `${
                    danger ? y : n
                }\u2000**Danger**\n• Start showing images relating to banned content stated in [Discord Community Guidelines](https://discord.com/guidelines). The bot owner will not take responsibilities if this caused your server to get banned.\n${
                    url ? y : n
                }\u2000**URL**\n• Allow members to call nhentai-related commands with URL. E.g: Posting https://nhentai.net/177013 will call command \`g\` with code \`177013\`.`
            );
            menu.spliceOptions(1, 0, [
                {
                    label: 'Danger',
                    value: 'danger',
                    emoji: danger ? n : y,
                },
                {
                    label: 'URL',
                    value: 'url',
                    emoji: url ? n : y,
                },
            ]);
        }
        return {
            embeds: [settings],
            components: [new MessageActionRow().addComponents(menu)],
        };
    }

    async exec(interaction: CommandInteraction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        let user = await User.findOne({ userID: member.id }).exec();
        if (!user) {
            user = await new User({
                userID: member.id,
                blacklists: [],
                anonymous: true,
            }).save();
        }
        let anonymous = user.anonymous,
            danger = null,
            url = null;
        if (member.permissions.has('MANAGE_GUILD')) {
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    serverID: interaction.guild.id,
                    settings: { danger: false, url: false },
                }).save();
            }
            danger = server.settings.danger;
            url = server.settings.url;
        }
        const message = (await interaction.editReply(
            this.update(anonymous, danger, url)
        )) as Message;
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === member.id,
            time: 300000,
        });
        collector.on('collect', async i => {
            if (!i.isSelectMenu()) return;
            await i.deferUpdate();
            if (i.values.includes('anon'))
                anonymous = await this.client.db.user.anonymous(member.id);
            if (i.values.includes('danger'))
                danger = await this.client.db.server.danger(interaction.guild.id);
            if (i.values.includes('url'))
                url = await this.client.db.server.url(interaction.guild.id);
            await interaction.editReply(this.update(anonymous, danger, url));
        });
    }
}
