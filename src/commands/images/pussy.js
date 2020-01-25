const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class PussyCommand extends Command {
    constructor() {
        super('pussy', {
            category: 'images',
            aliases: ['pussy'],
            channel: 'guild',
            description: {
                content: 'Mmm... Delicious!',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const pussy = await this.client.nekoslife.nsfw[this.client.extensions.random(['pussy', 'pussyWankGif', 'pussyArt', 'pussyGif'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${pussy.url})`).setImage(pussy.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
