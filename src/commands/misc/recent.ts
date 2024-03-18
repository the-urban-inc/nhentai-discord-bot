import { Client, Command } from '@structures';
import { CommandInteraction, Snowflake } from 'discord.js';
import { Server } from '@database/models';
import moment from 'moment';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'recent',
            type: 'CHAT_INPUT',
            description: 'Shows recent nhentai-related command calls in this server',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const server = await Server.findOne({
            serverID: interaction.guild.id,
        }).exec();
        if (!server) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                        .setDescription('There are no recent calls in this server!'),
                ],
            });
        }
        if (!server.recent.length) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                        .setDescription('There are no recent calls in this server!'),
                ],
            });
        }
        const recent = server.recent.reverse().slice(0, 5);
        const _ = await Promise.all(
            recent.map(async x => {
                return `• ${(await this.client.users.fetch(x.author as Snowflake)).tag}: **\`${
                    x.id
                }\`** \`${x.name}\` (<t:${moment(x.date).unix()}:R>)`;
            })
        );
        return interaction.editReply({
            embeds: [
                this.client.embeds
                    .default()
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setDescription(_.join('\n')),
            ],
        });
    }
}
