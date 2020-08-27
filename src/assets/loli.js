const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.export = class Loli extends Command {
    constructor() {
        super('loli', {
            category: 'images',
            aliases: ['loli'],
            channel: 'guild',
            description: {
                content: 'FBI here! Open up!',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const loli = await this.client.lolislife.getNSFWLoli();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${loli.url})`).setImage(loli.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, message, ['images']);
    }
};
