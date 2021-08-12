import { Client, Command } from '@structures';
import { CommandInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { PERMISSIONS } from '@constants';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'invite',
            type: 'CHAT_INPUT',
            description: 'Invite me to your server',
        });
    }

    exec(interaction: CommandInteraction) {
        return interaction.editReply({
            content: 'Click the button below to invite me to your server',
            components: [
                new MessageActionRow().addComponents(
                    new MessageButton()
                        .setLabel('Invite')
                        .setURL(
                            this.client.generateInvite({
                                scopes: ['bot', 'applications.commands'],
                                permissions: PERMISSIONS,
                            })
                        )
                        .setStyle('LINK')
                ),
            ],
        });
    }
}
