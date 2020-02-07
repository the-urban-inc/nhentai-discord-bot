const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const axios = require('axios');

const icon = 'https://cdn1.iconfinder.com/data/icons/somacro___dpi_social_media_icons_by_vervex-dfjq/500/reddit.png';

module.exports = class RedditCommand extends Command {
	constructor() {
		super('reddit', {
            category: 'general',
			aliases: ['reddit'],
			description: {
                content: 'Random post on r/nhentai.',
                usage: '',
                examples: ['']
            },
            cooldown: 3000
		});
    }

	async exec(message) {
        const data = await axios.get('https://reddit.com/r/nhentai/random.json').then((res) => res.data[0]['data']['children'][0]['data']).catch(err => this.client.logger.error(err));
        if (!data) return message.channel.send(this.client.embeds('error'));
        let embed = new MessageEmbed()
            .setAuthor(`${data['title']}`, icon, `https://reddit.com${data['permalink']}`)
            .setFooter(`Author: ${data['author']} | Upvote ratio: ${data['upvote_ratio'] * 100}%`)
        if (data['url'].match('.jpg') || data['url'].match('.png')) embed.setImage(data['url'])
        else embed.setImage(data['url'] + '.jpg')
        return message.channel.send({ embed }).then(async msg => { await msg.react('⬆'); await msg.react('⬇'); });
	}
};