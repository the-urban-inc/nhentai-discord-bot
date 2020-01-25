const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');

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
            cooldown: 10000
		});
    }

	exec(message, { page }) {
        page = parseInt(page);
		this.client.nhentai.homepage(page).then(async data => {
            if (!data.num_pages) return message.channel.send(this.client.embeds('error', 'Found nothing.'));
            if (!page || page < 1 || page > data.num_pages) return message.channel.send(this.client.embeds('error', 'Page number is not an integer or is out of range.'));
            const display = this.client.embeds('display').useCustomFooters()
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(new MessageEmbed()
                    .setTitle(`${he.decode(doujin.title)}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id} | **Language** : ${this.client.flag[doujin.language] || 'N/A'}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${data.results.length} | Page ${page} of ${data.num_pages || 1}`)
                    .setTimestamp(), doujin.id)
            }
            return display.run(await message.channel.send('Searching ...'));
        }).catch(err => {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds('error'));
        });
	}
};