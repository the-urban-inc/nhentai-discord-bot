const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class AnalCommand extends Command {
    constructor() {
        super('anal', {
            category: 'images',
            aliases: ['anal'],
            channel: 'guild',
            description: {
                content: 'Oops, wrong hole. Whatever.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const anal = await this.client.nekoslife.nsfw.anal();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${anal.url})`).setImage(anal.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
