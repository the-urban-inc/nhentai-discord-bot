const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class SoloCommand extends Command {
    constructor() {
        super('solo', {
            category: 'images',
            aliases: ['solo'],
            channel: 'guild',
            description: {
                content: 'Solo girl.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const solo = await this.client.nekoslife.nsfw[this.client.extensions.random(['girlSolo', 'girlSoloGif'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${solo.url})`).setImage(solo.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
