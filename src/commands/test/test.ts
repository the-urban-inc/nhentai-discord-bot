import { Client, Command } from '@structures';
import { CommandInteraction } from 'discord.js';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'test',
            description: 'A test command'
        })
    } 

    exec(interaction: CommandInteraction) {
        interaction.reply('mds gay vl');
    }
}