import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import axios from 'axios';

const ICON =
    'https://cdn1.iconfinder.com/data/icons/somacro___dpi_social_media_icons_by_vervex-dfjq/500/reddit.png';

export default class extends Command {
    constructor() {
        super('reddit', {
            aliases: ['reddit'],
            description: {
                content: 'Random post on r/nhentai.',
            },
        });
    }

    async exec(message: Message) {
        try {
            const data = await axios
                .get('https://reddit.com/r/nhentai/random.json')
                .then(res => res.data[0]['data']['children'][0]['data']);
            if (!data) throw new Error('No results found.');
            let embed = this.client.util
                .embed()
                .setAuthor(`${data['title']}`, ICON, `https://reddit.com${data['permalink']}`)
                .setFooter(
                    `Author: ${data['author']} | Upvote ratio: ${data['upvote_ratio'] * 100}%`
                );
            if (data['url'].match('.jpg') || data['url'].match('.png')) embed.setImage(data['url']);
            else embed.setImage(data['url'] + '.jpg');
            return message.channel.send({ embed }).then(async msg => {
                await msg.react('⬆');
                await msg.react('⬇');
            });
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
