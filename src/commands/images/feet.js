const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class FeetCommand extends Command {
    constructor() {
        super('feet', {
            category: 'images',
            aliases: ['feet'],
            channel: 'guild',
            description: {
                content: '*lick lick',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const feet = await this.client.nekoslife.nsfw[this.client.extensions.random(['feet', 'feetGif', 'eroFeet'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${feet.url})`).setImage(feet.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
