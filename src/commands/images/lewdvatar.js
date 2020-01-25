const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class HavatarCommand extends Command {
    constructor() {
        super('lewdvatar', {
            category: 'images',
            aliases: ['lewdvatar', 'lewdpfp', 'lpfp'],
            channel: 'guild',
            description: {
                content: 'Want some lewd pfp? ( ͡° ͜ʖ ͡°)',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const havatar = await this.client.nekoslife.nsfw.avatar();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${havatar.url})`).setImage(havatar.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
