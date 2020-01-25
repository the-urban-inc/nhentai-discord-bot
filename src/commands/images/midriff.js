const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class MidriffCommand extends Command {
    constructor() {
        super('midriff', {
            category: 'images',
            aliases: ['midriff'],
            channel: 'guild',
            description: {
                content: 'Welcome to our religion.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const midriff = await this.client.nekobot('hmidriff');
        if (midriff === 'Unknown Image Type') return message.channel.send('An unexpected error has occured.');
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${midriff})`).setImage(midriff);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};