const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class TrapCommand extends Command {
    constructor() {
        super('trap', {
            category: 'images',
            aliases: ['trap'],
            channel: 'guild',
            description: {
                content: 'Weird fetish you have.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const trap = await this.client.nekoslife.nsfw.trap();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${trap.url})`).setImage(trap.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
