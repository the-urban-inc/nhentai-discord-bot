const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class BoobsCommand extends Command {
    constructor() {
        super('boobs', {
            category: 'images',
            aliases: ['boobs', 'bewbs'],
            channel: 'guild',
            description: {
                content: 'The true heaven.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const boobs = await this.client.nekoslife.nsfw[this.client.extensions.random(['boobs', 'tits'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${boobs.url})`).setImage(boobs.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
