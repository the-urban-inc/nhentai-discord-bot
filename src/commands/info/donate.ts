import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'donate',
            type: ApplicationCommandType.ChatInput,
            description: "Show support to the bot's creator",
        });
    }

    exec(interaction: CommandInteraction) {
        return interaction.editReply({
            content:
                "If you really like me and want to support my creator, you can consider donating to my creator's Paypal. Do note that donating will not grant you any kinds of perks in return. Donating shows that the project is useful to you and you believe in the future of the project.",
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setLabel('Paypal')
                        .setURL('https://paypal.me/t41y0u67')
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel('Ko-fi')
                        .setURL('https://ko-fi.com/taiyou67')
                        .setStyle(ButtonStyle.Link)
                ]),
            ],
        });
    }
}
