const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');
const RichDisplay = require('../../utils/richDisplay');

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

	exec(message) {
        let error = new MessageEmbed()
            .setAuthor('❌ Error')
            .setColor('#ff0000')
            .setDescription('An unexpected error has occurred.')
            .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
            .setTimestamp()
		this.client.nhentai.random().then(async data => {
            this.client.nhentai.g(data.id).then(async doujin => {
                const info = new MessageEmbed()
                    .setAuthor(doujin.title.english, this.client.icon, `https://nhentai.net/g/${doujin.id}`)
                    .setThumbnail(doujin.getCoverThumbnail())
                    .setFooter(`ID: ${doujin.id}`)
                    .setTimestamp()
                let tags = new Map();
                doujin.tags.forEach(tag => {
                    if (!tags.has(tag.type)) tags.set(tag.type, []);
                    let a = tags.get(tag.type); a.push(`**\`${tag.name}\`**\`(${tag.count.toLocaleString()})\``);
                    tags.set(tag.type, a);
                });
                if (tags.has('parody')) info.addField('Parodies', tags.get('parody').join(' '));
                if (tags.has('character')) info.addField('Characters', tags.get('character').join(' '));
                if (tags.has('tag')) info.addField('Tags', tags.get('tag').join(' '));
                if (tags.has('artist')) info.addField('Artists', tags.get('artist').join(' '));
                if (tags.has('group')) info.addField('Groups', tags.get('group').join(' '));
                if (tags.has('language')) info.addField('Languages', tags.get('language').join(' '));
                if (tags.has('category')) info.addField('Categories', tags.get('category').join(' '));
                info.addField('‏‏‎ ‎', `${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
                const display = new RichDisplay().addPage(info);
                doujin.getPages().forEach(page => display.addPage(new MessageEmbed().setImage(page).setTimestamp()));
                return display.run(await message.channel.send('Searching for doujin ...'));
            }).catch(err => {
                this.client.logger.error(err);
                return message.channel.send(error);
            });
        }).catch(err => {
            this.client.logger.error(err);
            return message.channel.send(error);
        });
	}
};