const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class KetaCommand extends Command {
    constructor() {
        super('keta', {
            category: 'images',
            aliases: ['keta'],
            channel: 'guild',
            description: {
                content: 'It\'s keta.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const keta = await this.client.nekoslife.nsfw.keta();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${keta.url})`).setImage(keta.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
