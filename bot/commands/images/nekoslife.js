const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class Nekoslife extends Command {
    constructor() {
        super('nekoslife', {
            category: 'images',
            aliases: ['nekoslife', 'nl'],
            channel: 'guild',
            description: {
                content: 'Fetch NSFW images from nekos.life by tags.',
                usage: '[tag]',
                examples: ['']
            },
            split: 'plain',
            args: [{
                id: 'tag',
                type: 'lowercase'
            }],
            cooldown: 3000
        });
    }

    async exec(message, { tag }) {
        if (!tag || !Object.keys(this.client.nltags).includes(tag)) return message.channel.send(this.client.embeds('error', `Unknown tag. The following tags are available: ${Object.keys(this.client.nltags).map(x => `\`${x}\``).join(' ')}`));
        const image = await this.client.nekoslife.nsfw[this.client.extensions.random(this.client.nltags[tag])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${image.url})`).setImage(image.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
