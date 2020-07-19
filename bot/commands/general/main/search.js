const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');

module.exports = class SearchCommand extends Command {
	constructor() {
		super('search', {
            category: 'general',
			aliases: ['search'],
			description: {
                content: 'Searches nhentai for given query.',
                usage: '<text> [--page=pagenum] [--sort=(recent/popular-today/popular-week/popular)]',
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
                default: 'recent'
            }],
            cooldown: 3000
		});
    }

	async exec(message, { text, page, sort }) {
        if (!text) return message.channel.send(this.client.embeds('error', 'Search text is not specified.'));
        page = parseInt(page, 10);
        if (!['recent', 'popular-today', 'popular-week', 'popular'].includes(sort)) return message.channel.send(this.client.embeds('error', 'Invalid sort method provided. Available methods are: `recent`, `popular-today`, `popular-week`, `popular`.'));
		const data = await this.client.nhentai.search(text, page, sort).then(data => data).catch(err => this.client.logger.error(err));
        if (!data) return message.channel.send(this.client.embeds('error'));
        if (!data.results.length) return message.channel.send(this.client.embeds('error', 'No results found.'));
        if (!page || page < 1 || page > data.num_pages) return message.channel.send(this.client.embeds('error', 'Page number is not an integer or is out of range.'));
        const display = this.client.embeds('display').useCustomFooters()
        for (const [idx, doujin] of data.results.entries()) {
            display.addPage(new MessageEmbed()
                .setTitle(`${he.decode(doujin.title)}`)
                .setURL(`https://nhentai.net/g/${doujin.id}`)
                .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${this.client.flag[doujin.language] || 'N/A'}`)
                .setImage(doujin.thumbnail.s)
                .setFooter(`Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${data.num_pages || 1} • Found ${data.num_results} result(s)`)
                .setTimestamp(), doujin.id)
        }
        return display.run(message, await message.channel.send('Searching ...'));
	}
};