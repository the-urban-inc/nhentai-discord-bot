import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';
import { Logger } from '@nhentai/utils/logger';
import { Embeds } from '@nhentai/utils/embeds';

const ICON = 'https://cdn1.iconfinder.com/data/icons/somacro___dpi_social_media_icons_by_vervex-dfjq/500/reddit.png';

export class RedditCommand extends Command {
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

	async exec(message: Message) {
        const data = await axios.get('https://reddit.com/r/nhentai/random.json').then((res) => res.data[0]['data']['children'][0]['data']).catch(err => Logger.error(err));
        if (!data) return message.channel.send(Embeds.error());
        let embed = new MessageEmbed()
            .setAuthor(`${data['title']}`, ICON, `https://reddit.com${data['permalink']}`)
            .setFooter(`Author: ${data['author']} | Upvote ratio: ${data['upvote_ratio'] * 100}%`)
        if (data['url'].match('.jpg') || data['url'].match('.png')) embed.setImage(data['url'])
        else embed.setImage(data['url'] + '.jpg')
        return message.channel.send({ embed }).then(async msg => { await msg.react('⬆'); await msg.react('⬇'); });
	}
};