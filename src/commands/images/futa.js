const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class FutaCommand extends Command {
    constructor() {
        super('futa', {
            category: 'images',
            aliases: ['futa', 'futanari'],
            channel: 'guild',
            description: {
                content: 'Weird fetish you have.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const futa = await this.client.nekoslife.nsfw.futanari();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${futa.url})`).setImage(futa.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
