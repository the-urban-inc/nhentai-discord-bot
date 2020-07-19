const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');
const User = require('../../../models/user');

module.exports = class ParodyCommand extends Command {
	constructor() {
		super('parody', {
            category: 'general',
			aliases: ['parody'],
			description: {
                content: 'Searches nhentai for given parody.',
                usage: '<text> [--page=pagenum] [--sort=(recent/popular-today/popular-week/popular)]',
                examples: ['kono subarashii sekai ni syukufuku o', 'fate grand order -p=2', 'azur lane -s=popular']
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
        if (!text) return message.channel.send(this.client.embeds('error', 'Parody name is not specified.'));
        page = parseInt(page, 10);
        if (!['recent', 'popular-today', 'popular-week', 'popular'].includes(sort)) return message.channel.send(this.client.embeds('error', 'Invalid sort method provided. Available methods are: `recent`, `popular-today`, `popular-week`, `popular`.'));
		const data = await this.client.nhentai.parody(text.toLowerCase(), page, sort).then(data => data).catch(err => this.client.logger.error(err));
        if (!data) return message.channel.send(this.client.embeds('error', 'An unexpected error has occurred. Are you sure this is an existing parody?'));
        if (!data.results.length) return message.channel.send(this.client.embeds('error', 'No results, sorry.'));
        if (!page || page < 1 || page > data.num_pages) return message.channel.send(this.client.embeds('error', 'Page number is not an integer or is out of range.'));

        await User.findOne({
            userID: message.author.id
        }, async (err, user) => {
            if (err) {
                failed = true;
                return this.client.logger.error(err);
            }
            if (!user) {
                const newUser = new User({
                    userID: message.author.id,
                    history: {
                        parody: [{
                            id: text.toLowerCase(),
                            recent: Date.now()
                        }]
                    }
                });
                newUser.save().catch(err => {
                    failed = true;
                    return this.client.logger.error(err);
                });
            } else {
                user.history.parody.push({
                    id: text.toLowerCase(),
                    recent: Date.now()
                });
                user.save().catch(err => {
                    failed = true;
                    return this.client.logger.error(err);
                });
            }
        });

        const display = this.client.embeds('display').useCustomFooters();
        for (const [idx, doujin] of data.results.entries()) {
            display.addPage(new MessageEmbed()
                .setTitle(`${he.decode(doujin.title)}`)
                .setURL(`https://nhentai.net/g/${doujin.id}`)
                .setDescription(`**ID** : ${doujin.id}\u2000•\u2000**Language** : ${this.client.flag[doujin.language] || 'N/A'}`)
                .setImage(doujin.thumbnail.s)
                .setFooter(`Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${data.num_pages || 1} • ${data.num_results} doujin(s)`)
                .setTimestamp(), doujin.id)
        }
        return display.run(message, await message.channel.send('Searching ...'));
	}
};