const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class AssCommand extends Command {
    constructor() {
        super('ass', {
            category: 'images',
            aliases: ['ass'],
            channel: 'guild',
            description: {
                content: 'Ass.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const ass = await this.client.nekobot('hass');
        if (ass === 'Unknown Image Type') return message.channel.send(this.client.embeds('error'));
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${ass})`).setImage(ass);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
