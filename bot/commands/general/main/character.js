const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');

module.exports = class CharacterCommand extends Command {
	constructor() {
		super('character', {
            category: 'general',
			aliases: ['character'],
			description: {
                content: 'Searches nhentai for given character.',
                usage: '<text> [--page=pagenum] [--sort=(date/popular)]',
                examples: ['laffey', 'aqua -p=2', 'megumin -s=popular']
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

	async exec(message, { text, page, sort }) {
        if (!text) return message.channel.send(this.client.embeds('error', 'Character name is not specified.'));
        page = parseInt(page);
        if (sort !== 'date' && sort !== 'popular') return message.channel.send(this.client.embeds('error', 'Invalid sort method provided. Available methods are: `date` and `popular`'));
		const data = await this.client.nhentai.character(text.toLowerCase(), page, sort).then(data => data).catch(err => this.client.logger.error(err));
        if (!data) return message.channel.send(this.client.embeds('error', 'An unexpected error has occurred. Are you sure this is an existing character?'));
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
	}
};