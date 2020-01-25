const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class CumCommand extends Command {
    constructor() {
        super('cum', {
            category: 'images',
            aliases: ['cum'],
            channel: 'guild',
            description: {
                content: 'I\'m... I\'m cumming! >//<',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const cum = await this.client.nekoslife.nsfw[this.client.extensions.random(['cumsluts', 'cumArts'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${cum.url})`).setImage(cum.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
