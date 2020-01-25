const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class FemdomCommand extends Command {
    constructor() {
        super('femdom', {
            category: 'images',
            aliases: ['femdom'],
            channel: 'guild',
            description: {
                content: 'Female rules!',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const femdom = await this.client.nekoslife.nsfw.femdom();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${femdom.url})`).setImage(femdom.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
