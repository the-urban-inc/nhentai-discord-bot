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
                usage: '[--auto]',
                examples: ['', '--auto']
            },
            args: [{
                id: 'auto',
                match: 'flag',
                flag: ['-a', '--auto']
            }],
            cooldown: 3000
		});
    }

	async exec(message, { auto }) {
		const doujin = await this.client.nhentai.random().then(data => data).catch(err => this.client.logger.error(err));
        if (!doujin) return message.channel.send(this.client.embeds('error'));

        const info = new MessageEmbed()
            .setAuthor(he.decode(doujin.title.english), this.client.icon, `https://nhentai.net/g/${doujin.id}`)
            .setThumbnail(doujin.getCoverThumbnail())
            .setFooter(`ID : ${doujin.id}${auto ? '• React with 🇦 to start an auto session' : ''}`)
            .setTimestamp()
        let tags = new Map();
        doujin.tags.forEach(tag => {
            if (!tags.has(tag.type)) tags.set(tag.type, []);
            let a = tags.get(tag.type); a.push(`**\`${tag.name}\`**\`(${tag.count.toLocaleString()})\``);
            // let a = tags.get(tag.type); a.push(`**\`[${tag.name}\`**|\`${tag.count.toLocaleString()}]\``);
            tags.set(tag.type, a);
        });
        if (tags.has('parody')) info.addField('Parodies', this.client.extensions.gshorten(tags.get('parody')));
        if (tags.has('character')) info.addField('Characters', this.client.extensions.gshorten(tags.get('character')));
        if (tags.has('tag')) info.addField('Tags', this.client.extensions.gshorten(tags.get('tag')));
        if (tags.has('artist')) info.addField('Artists', this.client.extensions.gshorten(tags.get('artist')));
        if (tags.has('group')) info.addField('Groups', this.client.extensions.gshorten(tags.get('group')));
        if (tags.has('language')) info.addField('Languages', this.client.extensions.gshorten(tags.get('language')));
        if (tags.has('category')) info.addField('Categories', this.client.extensions.gshorten(tags.get('category')));
        // info.addField('‏‏‎ ‎', `${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
        info.addField('Pages', `**\`${doujin.num_pages}\`**`);
        // info.addField('Pages', `**\`[${doujin.num_pages}]\`**`);
        info.addField('Uploaded', moment(doujin.upload_date * 1000).fromNow());

        const displayDoujin = this.client.embeds('display').setGID(doujin.id).setInfoPage(info).useMultipleDisplay(true);
        if (auto) displayDoujin.useAutoMode();
        doujin.getPages().forEach(page => displayDoujin.addPage(new MessageEmbed().setImage(page).setTimestamp()));
        const displayDoujinHandler = await displayDoujin.run(message, await message.channel.send('Searching for doujin ...'));
        return;
        const displayRelated = this.client.embeds('display').useCustomFooters().useMultipleDisplay(displayDoujinHandler);
        for (const [idx, doujinRelated] of doujin.related.entries()) {
            displayRelated.addPage(new MessageEmbed()
                .setTitle(`${he.decode(doujinRelated.title)}`)
                .setURL(`https://nhentai.net/g/${doujinRelated.id}`)
                .setDescription(`**ID** : ${doujinRelated.id}\u2000•\u2000**Language** : ${this.client.flag[doujinRelated.language] || 'N/A'}`)
                .setImage(doujinRelated.thumbnail.s)
                .setFooter(`Doujin ${idx + 1} of ${doujin.related.length}`)
                .setTimestamp(), doujinRelated.id)
        }
        const displayRelatedHandler = await displayRelated.run(message, await message.channel.send('**More Like This**'));

        if (!doujin.comments.length) return;
        const displayComments = this.client.embeds('display').useCustomFooters().useMultipleDisplay(displayRelatedHandler);
        for (const [idx, comment] of doujin.comments.entries()) {
            displayComments.addPage(new MessageEmbed()
                .setAuthor(`${he.decode(comment.poster.username)}`, `https://i5.nhentai.net/${comment.poster.avatar_url}`)
                .setDescription(comment.body)
                .setFooter(`Comment ${idx + 1} of ${doujin.comments.length}\u2000•\u2000Posted ${moment(comment.post_date * 1000).fromNow()}`))
        }
        return displayComments.run(message, await message.channel.send('`💬` **Comments**'), ['love']);
	}
};
