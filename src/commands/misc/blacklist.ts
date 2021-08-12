import { Client, Command } from '@structures';
import { CommandInteraction } from 'discord.js';
import { User } from '@database/models';

export default class extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'blacklist',
            type: 'CHAT_INPUT',
            description: 'Shows your blacklist',
            cooldown: 10000,
            nsfw: true,
        });
    }

    async exec(interaction: CommandInteraction) {
        const member = interaction.user;
        const user = await User.findOne({
            userID: member.id,
        }).exec();
        if (!user) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle('🏴\u2000Blacklist')
                        .setDescription('You have no blacklist entry!'),
                ],
            });
        }
        if (!user.blacklists.length) {
            return interaction.editReply({
                embeds: [
                    this.client.embeds
                        .default()
                        .setTitle('🏴\u2000Blacklist')
                        .setDescription('You have no blacklist entry!'),
                ],
            });
        }
        let embed = this.client.embeds
            .default()
            .setTitle('🏴\u2000Blacklist');
        let t = new Map<string, string[]>();
        user.blacklists.forEach(tag => {
            const { type, name } = tag;
            let a = t.get(type) || [];
            a.push(`\`${name}\``);
            t.set(type, a);
        });
        [
            ['parody', 'Parodies'],
            ['character', 'Characters'],
            ['tag', 'Tags'],
            ['artist', 'Artists'],
            ['group', 'Groups'],
            ['language', 'Languages'],
            ['category', 'Categories'],
        ].forEach(([key, fieldName]) => {
            t.has(key) && embed.addField(fieldName, t.get(key).join(', '));
        });
        return interaction.editReply({ embeds: [embed] });
    }
}
