import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import he from 'he';
import { NhentaiClient } from '@nhentai/struct/Client';
import { Logger } from '@nhentai/utils/logger';
import { Embeds } from '@nhentai/utils/embeds';
import { FLAG_EMOJIS } from '@nhentai/utils/constants';

export class HomeCommand extends Command {
	constructor() {
		super('home', {
            category: 'general',
			aliases: ['home', 'homepage'],
			description: {
                content: 'nhentai homepage.',
                usage: '[--page=pagenum]',
                examples: ['', '-p=3']
            },
            args: [{
                id: 'page',
                match: 'option',
                flag: ['--page=', '-p='],
                default: '1'
            }],
            cooldown: 3000
		});
    }

	async exec(message: Message, { page } : { page: string }) {
        let pageNum = parseInt(page, 10);
		const data = await (this.client as NhentaiClient).nhentai.homepage(pageNum).then(data => data).catch(err => Logger.error(err));
        if (!data) return message.channel.send(Embeds.error());
        if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > data.num_pages) return message.channel.send(Embeds.error('Page number is not an integer or is out of range.'));
        
        if (pageNum == 1) {
            const popularNow = data.results.slice(0, 5);
            const displayPopular = Embeds.display(this.client as NhentaiClient).useCustomFooters();
            for (const [idx, doujin] of popularNow.entries()) {
                displayPopular.addPage(new MessageEmbed()
                    .setTitle(`${he.decode(doujin.title)}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] || 'N/A'}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${popularNow.length} • Page ${page} of ${data.num_pages || 1}`)
                    .setTimestamp(), doujin.id)
            }
            const displayPopularHandler = await displayPopular.run(message, await message.channel.send('Searching ...\n\n`🔥` **Popular Now**'));
            
            const newUploads = data.results.slice(5);
            const displayNew = Embeds.display(this.client as NhentaiClient).useCustomFooters().useMultipleDisplay(displayPopular);
            for (const [idx, doujin] of newUploads.entries()) {
                displayNew.addPage(new MessageEmbed()
                    .setTitle(`${he.decode(doujin.title)}`)
                    .setURL(`https://nhentai.net/g/${doujin.id}`)
                    .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] || 'N/A'}`)
                    .setImage(doujin.thumbnail.s)
                    .setFooter(`Doujin ${idx + 1} of ${newUploads.length} • Page ${page} of ${data.num_pages || 1}`)
                    .setTimestamp(), doujin.id)
            }
            return displayNew.run(message, await message.channel.send('`🧻` **New Uploads**'));
        }

        const display = Embeds.display(this.client as NhentaiClient).useCustomFooters()
        for (const [idx, doujin] of data.results.entries()) {
            display.addPage(new MessageEmbed()
                .setTitle(`${he.decode(doujin.title)}`)
                .setURL(`https://nhentai.net/g/${doujin.id}`)
                .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] || 'N/A'}`)
                .setImage(doujin.thumbnail.s)
                .setFooter(`Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${data.num_pages || 1}`)
                .setTimestamp(), doujin.id)
        }
        return display.run(message, await message.channel.send('Searching ...'));
	}
};