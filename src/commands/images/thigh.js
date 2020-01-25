const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { removeWithTrashcan } = require('../../utils/extensions');

class Thigh extends Command {
    constructor() {
        super('thigh', {
            category: 'images',
            aliases: ['thigh', 'thicc'],
            channel: 'guild',
            description: {
                content: 'T H I C C.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const thigh = await this.client.nekobot('hthigh');
        if (thigh === 'Unknown Image Type') return message.channel.send('An unexpected error has occured.');
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${thigh})`).setImage(thigh);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
}

module.exports = Thigh;
