const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class KuniCommand extends Command {
    constructor() {
        super('kuni', {
            category: 'images',
            aliases: ['kuni'],
            channel: 'guild',
            description: {
                content: 'Imma need some foreplay before the real action.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const kuni = await this.client.nekoslife.nsfw.kuni();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${kuni.url})`).setImage(kuni.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
