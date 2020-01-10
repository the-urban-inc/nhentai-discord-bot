const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');
const RichDisplay = require('../../utils/richDisplay');

module.exports = class ArtistCommand extends Command {
	constructor() {
		super('artist', {
            category: 'general',
			aliases: ['artist'],
			description: {
                content: 'Searches nHentai for given artist.',
                usage: '<text> [--page=pagenum] [--sort=(date/popular)]',
                examples: ['lolicon', 'rape -p=2', 'ahegao -s=popular']
            },
            split: 'sticky',
            args: [{
                id: 'text',
                type: 'string',
                match: 'text'
            }, {
                id: 'page',
                match: 'option',
                flag: ['--page=', '-p='],
                default: '1'
            },{
                id: 'sort',
                match: 'option',
                flag: ['--sort=', '-s='],
                default: 'date'
            }],
            cooldown: 10000
		});
    }

	exec(message, { text, page, sort }) {
        page = parseInt(page);
        if (sort !== 'date' && sort !== 'popular') return this.client.embeds.error(message, 'Invalid sort method provided. Available methods are: `date` and `popular`');
		this.client.nhentai.artist(text.toLowerCase(), page, sort).then(async data => {
            if (!data.num_pages) return this.client.embeds.error(message, 'Found nothing.');
            if (!page || page < 1 || page > data.num_pages) return this.client.embeds.error(message, 'Page number is not an integer or is out of range.');
            const display = new RichDisplay().useCustomFooters().setRequester(message.author.id)
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(new MessageEmbed()
                    .setTitle(`${he.decode(doujin.title)}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id} | **Language** : ${this.client.flag[doujin.language]}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${data.results.length} | Page ${page} of ${data.num_pages}`)
                    .setTimestamp(), doujin.id)
            }
            return display.run(await message.channel.send('Searching ...'));
        }).catch(err => {
            this.client.logger.error(err);
            return this.client.embeds.error(message);
        });
	}
};