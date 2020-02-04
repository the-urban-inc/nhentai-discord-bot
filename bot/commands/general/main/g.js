const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');
const moment = require('moment');

module.exports = class GCommand extends Command {
	constructor() {
		super('g', {
            category: 'general',
			aliases: ['g', 'get', 'doujin'],
			description: {
                content: 'Searches for a code on nhentai.',
                usage: '<code>',
                examples: ['177013']
            },
            args: [{
                id: 'code',
                type: 'string',
                match: 'text'
            }],
            cooldown: 10000
		});
    }

	exec(message, { code }) {
        if (!code) return message.channel.send(this.client.embeds('error', 'Code is not specified.'));
		this.client.nhentai.g(code).then(async doujin => {
            const info = new MessageEmbed()
                .setAuthor(he.decode(doujin.title.english), this.client.icon, `https://nhentai.net/g/${doujin.id}`)
                .setThumbnail(doujin.getCoverThumbnail())
                .setFooter(`ID : ${doujin.id} • React with 🇦 to start an auto session`)
                .setTimestamp()
            let tags = new Map();
            doujin.tags.forEach(tag => {
                if (!tags.has(tag.type)) tags.set(tag.type, []);
                let a = tags.get(tag.type); a.push(`**\`${tag.name}\`**\`(${tag.count.toLocaleString()})\``);
                tags.set(tag.type, a);
            });
            if (tags.has('parody')) info.addField('Parodies', this.client.extensions.shorten(tags.get('parody').join(' ')));
            if (tags.has('character')) info.addField('Characters', this.client.extensions.shorten(tags.get('character').join(' ')));
            if (tags.has('tag')) info.addField('Tags', this.client.extensions.shorten(tags.get('tag').join(' ')));
            if (tags.has('artist')) info.addField('Artists', this.client.extensions.shorten(tags.get('artist').join(' ')));
            if (tags.has('group')) info.addField('Groups', this.client.extensions.shorten(tags.get('group').join(' ')));
            if (tags.has('language')) info.addField('Languages', this.client.extensions.shorten(tags.get('language').join(' ')));
            if (tags.has('category')) info.addField('Categories', this.client.extensions.shorten(tags.get('category').join(' ')));
            info.addField('‏‏‎ ‎', `${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
            const display = this.client.embeds('display').useAutoMode().setGID(doujin.id).setInfoPage(info);
            doujin.getPages().forEach(page => display.addPage(new MessageEmbed().setImage(page).setTimestamp()));
            return display.run(await message.channel.send('Searching for doujin ...'));
        }).catch(err => {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds('error', 'An unexpected error has occurred. Are you sure this is an existing doujin?'));
        });
	}
};