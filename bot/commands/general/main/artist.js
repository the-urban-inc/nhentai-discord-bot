const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');

module.exports = class ArtistCommand extends Command {
	constructor() {
		super('artist', {
            category: 'general',
			aliases: ['artist'],
			description: {
                content: 'Searches nhentai for given artist.',
                usage: '<text> [--page=pagenum] [--sort=(date/popular)]',
                examples: ['hiten', 'hiten -p=2', 'hiten -s=popular']
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
        if (!text) return message.channel.send(this.client.embeds('error', 'Artist name is not specified.'));
        page = parseInt(page);
        if (sort !== 'date' && sort !== 'popular') return message.channel.send(this.client.embeds('error', 'Invalid sort method provided. Available methods are: `date` and `popular`'));
		this.client.nhentai.artist(text.toLowerCase(), page, sort).then(async data => {
            if (!data.num_pages || !data.results.length) return message.channel.send(this.client.embeds('error', 'Found nothing.'));
            if (!page || page < 1 || page > data.num_pages) return messsage.channel.send(this.client.embeds('error', 'Page number is not an integer or is out of range.'));
            const display = this.client.embeds('display').useCustomFooters()
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(new MessageEmbed()
                    .setTitle(`${he.decode(doujin.title)}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${this.client.flag[doujin.language] || 'N/A'}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${data.num_pages || 1}`)
                    .setTimestamp(), doujin.id)
            }
            return display.run(message, await message.channel.send('Searching ...'));
        }).catch(err => {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds('error', 'An unexpected error has occurred. Are you sure this is an existing artist?'));
        });
	}
};