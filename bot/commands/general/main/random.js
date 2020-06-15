const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');
const moment = require('moment');

module.exports = class RandomCommand extends Command {
	constructor() {
		super('random', {
            category: 'general',
			aliases: ['random'],
			description: {
                content: 'Random doujin.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
		});
    }

	async exec(message) {
		const data = await this.client.nhentai.random().then(data => data).catch(err => this.client.logger.error(err));
        if (!data) return message.channel.send(this.client.embeds('error'));
        const doujin = await this.client.nhentai.g(data.id).then(doujin => doujin).catch(err => this.client.logger.error(err));
        if (!doujin) return message.channel.send(this.client.embeds('error'));
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
        if (tags.has('parody')) info.addField('Parodies', this.client.extensions.gshorten(tags.get('parody')));
        if (tags.has('character')) info.addField('Characters', this.client.extensions.gshorten(tags.get('character')));
        if (tags.has('tag')) info.addField('Tags', this.client.extensions.gshorten(tags.get('tag')));
        if (tags.has('artist')) info.addField('Artists', this.client.extensions.gshorten(tags.get('artist')));
        if (tags.has('group')) info.addField('Groups', this.client.extensions.gshorten(tags.get('group')));
        if (tags.has('language')) info.addField('Languages', this.client.extensions.gshorten(tags.get('language')));
        if (tags.has('category')) info.addField('Categories', this.client.extensions.gshorten(tags.get('category')));
        info.addField('‏‏‎ ‎', `ID : ${doujin.id}\u2000•\u2000${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
        const display = this.client.embeds('display').useAutoMode().setGID(doujin.id).addPage(info);
        doujin.getPages().forEach(page => display.addPage(new MessageEmbed().setImage(page).setTimestamp()));
        return display.run(message, await message.channel.send('Searching for doujin ...'));
	}
};
