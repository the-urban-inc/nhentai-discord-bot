const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class EroCommand extends Command {
    constructor() {
        super('ero', {
            category: 'images',
            aliases: ['ero', 'lewd'],
            channel: 'guild',
            description: {
                content: 'L... Lewd! >//<',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const ero = await this.client.nekoslife.nsfw.ero();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${ero.url})`).setImage(ero.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
