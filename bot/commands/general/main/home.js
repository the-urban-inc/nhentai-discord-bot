const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');

module.exports = class HomeCommand extends Command {
	constructor() {
		super('home', {
            category: 'general',
			aliases: ['home', 'homepage'],
			description: {
                content: 'nhentai homepage.',
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

	async exec(message, { page }) {
        page = parseInt(page, 10);
		const data = await this.client.nhentai.homepage(page).then(data => data).catch(err => this.client.logger.error(err));
        if (!data) return message.channel.send(this.client.embeds('error'));
        if (!page || page < 1 || page > data.num_pages) return message.channel.send(this.client.embeds('error', 'Page number is not an integer or is out of range.'));
        
        if (page == 1) {
            const popularNow = data.results.slice(0, 5);
            const displayPopular = this.client.embeds('display').useCustomFooters()
            for (const [idx, doujin] of popularNow.entries()) {
                displayPopular.addPage(new MessageEmbed()
                    .setTitle(`${he.decode(doujin.title)}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${this.client.flag[doujin.language] || 'N/A'}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${popularNow.length} • Page ${page} of ${data.num_pages || 1}`)
                    .setTimestamp(), doujin.id)
            }
            const displayPopularHandler = await displayPopular.run(message, await message.channel.send('Searching ...\n\n`🔥` **Popular Now**'));
            
            const newUploads = data.results.slice(5);
            const displayNew = this.client.embeds('display').useCustomFooters().useMultipleDisplay(displayPopularHandler)
            for (const [idx, doujin] of newUploads.entries()) {
                displayNew.addPage(new MessageEmbed()
                    .setTitle(`${he.decode(doujin.title)}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${this.client.flag[doujin.language] || 'N/A'}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${newUploads.length} • Page ${page} of ${data.num_pages || 1}`)
                    .setTimestamp(), doujin.id)
            }
            return displayNew.run(message, await message.channel.send('`🧻` **New Uploads**'));
        }

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