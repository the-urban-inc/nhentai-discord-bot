const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class Nekobot extends Command {
    constructor() {
        super('nekobot', {
            category: 'images',
            aliases: ['nekobot', 'nb'],
            channel: 'guild',
            description: {
                content: 'Fetch NSFW images from nekobot.xyz by tags.',
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
        if (!tag || !Object.keys(this.client.nbtags).includes(tag)) return message.channel.send(this.client.embeds('error', `Unknown tag. The following tags are available: ${Object.keys(this.client.nbtags).map(x => `\`${x}\``).join(' ')}`));
        const image = await this.client.nekobot(this.client.extensions.random(this.client.nbtags[tag]));
        if (image === 'Unknown Image Type') return message.channel.send(this.client.embeds('error'));
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${image})`).setImage(image);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
