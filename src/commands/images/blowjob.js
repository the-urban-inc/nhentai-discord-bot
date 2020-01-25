const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class BlowJobCommand extends Command {
    constructor() {
        super('blowjob', {
            category: 'images',
            aliases: ['blowjob', 'bj'],
            channel: 'guild',
            description: {
                content: 'Lady suck mah pp pls.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const blowjob = await this.client.nekoslife.nsfw[this.client.extensions.random(['bJ', 'blowJob'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${blowjob.url})`).setImage(blowjob.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
