const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const RichDisplay = require('../../utils/richDisplay');

module.exports = class HomeCommand extends Command {
	constructor() {
		super('home', {
            category: 'general',
			aliases: ['home', 'homepage'],
			description: {
                content: 'nHentai homepage.',
                usage: '[--page=pagenum]',
                examples: ['', '-p=3']
            },
            split: 'sticky',
            args: [{
                id: 'page',
                match: 'option',
                flag: ['--page=', '-p='],
                default: '1'
            }],
            cooldown: 3000
		});
    }

	exec(message, { page }) {
        let error = new MessageEmbed()
            .setAuthor('❌ Error')
            .setColor('#ff0000')
            .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
            .setTimestamp()
        page = parseInt(page);
		this.client.nhentai.homepage(page).then(async data => {
            if (!data.num_pages) return message.channel.send(error.setDescription('Found nothing.'));
            if (!page || page < 1 || page > data.num_pages) return message.channel.send(error.setDescription('Page number is not an integer or is out of range.'))
            const display = new RichDisplay().useCustomFooters()
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(new MessageEmbed()
                    .setTitle(`${doujin.title}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id} | **Language** : ${this.client.flag[doujin.language]}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${data.results.length} | Page ${page} of ${data.num_pages}`)
                    .setTimestamp())
            }
            return display.run(await message.channel.send('Searching ...'));
        }).catch(err => {
            this.client.logger.error(err);
            return message.channel.send(error.setDescription('An unexpected error has occurred.'))
        });
	}
};