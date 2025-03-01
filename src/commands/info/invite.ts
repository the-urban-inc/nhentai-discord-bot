import { Client, Command } from '@structures';
import { ApplicationCommandType, CommandInteraction, ActionRowBuilder, ButtonBuilder, OAuth2Scopes, ButtonStyle } from 'discord.js';
import { PERMISSIONS } from '@constants';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'invite',
            type: ApplicationCommandType.ChatInput,
            description: 'Invite me to your server',
        });
    }

    exec(interaction: CommandInteraction) {
        return interaction.editReply({
            content: 'Click the button below to invite me to your server',
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel('Invite')
                        .setURL(
                            this.client.generateInvite({
                                scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
                                permissions: PERMISSIONS,
                            })
                        )
                        .setStyle(ButtonStyle.Link)
                ),
            ],
        });
    }
}
