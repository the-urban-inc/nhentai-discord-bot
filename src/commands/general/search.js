const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const RichDisplay = require('../../utils/richDisplay');

module.exports = class SearchCommand extends Command {
	constructor() {
		super('search', {
            category: 'general',
			aliases: ['search'],
			description: {
                content: 'Searches nHentai.',
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
            cooldown: 3000
		});
    }

	exec(message, { text, page, sort }) {
        let error = new MessageEmbed()
            .setAuthor('❌ Error')
            .setColor('#ff0000')
            .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
            .setTimestamp()
        page = parseInt(page);
        if (sort !== 'date' && sort !== 'popular') return message.channel.send(error.setDescription('Invalid sort method provided. Available methods are: `date` and `popular`'));
		this.client.nhentai.search(text, page, sort).then(async data => {
            if (!data.num_results) return message.channel.send(error.setDescription('Found nothing.'));
            if (!page || page < 1 || page > data.num_pages) return message.channel.send(error.setDescription('Page number is not an integer or is out of range.'));
            const display = new RichDisplay().useCustomFooters()
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(new MessageEmbed()
                    .setTitle(`${doujin.title}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id} | **Language** : ${this.client.flag[doujin.language]}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${data.results.length} | Page ${page} of ${data.num_pages} | Found ${data.num_results} results`)
                    .setTimestamp())
            }
            return display.run(await message.channel.send('Searching ...'));
        }).catch(err => {
            this.client.logger.error(err);
            return message.channel.send(error.setDescription('An unexpected error has occurred.'))
        });
	}
};