const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class YuriCommand extends Command {
    constructor() {
        super('yuri', {
            category: 'images',
            aliases: ['yuri'],
            channel: 'guild',
            description: {
                content: 'Gei!',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const yuri = await this.client.nekoslife.nsfw[this.client.extensions.random(['yuri', 'lesbian', 'eroYuri'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${yuri.url})`).setImage(yuri.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
