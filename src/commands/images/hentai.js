const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

module.exports = class HentaiCommand extends Command {
    constructor() {
        super('hentai', {
            category: 'images',
            aliases: ['hentai'],
            channel: 'guild',
            description: {
                content: 'Who wouldn\'t want hentai?',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
        });
    }

    async exec(message) {
        const hentai = await  this.client.nekoslife.nsfw[this.client.extensions.random(['classic', 'randomHentaiGif'])]();
        const embed = new MessageEmbed().setDescription(`[Click here if image failed to load](${hentai.url})`).setImage(hentai.url);
        this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
    }
};
