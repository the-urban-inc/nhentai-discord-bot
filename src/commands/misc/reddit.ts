import { Command } from '@structures';
import { Message } from 'discord.js';
import axios from 'axios';
import config from '@config';
const PREFIX = config.settings.prefix.nsfw[0];
const ICON =
    'https://cdn1.iconfinder.com/data/icons/somacro___dpi_social_media_icons_by_vervex-dfjq/500/reddit.png';

export default class extends Command {
    constructor() {
        super('reddit', {
            aliases: ['reddit'],
            nsfw: true,
            description: {
                content: 'Shows random post on r/nhentai.',
                examples: ['\nSauce?'],
            },
            error: {
                'No Result': {
                    message: 'Failed to fetch Reddit post!',
                    example: `Please try again later. If this error continues to persist, join the support server (${PREFIX}support) and report it to the admin/mods.`,
                },
            },
        });
    }

    async exec(message: Message) {
        try {
            const data = await axios
                .get('https://reddit.com/r/nhentai/random.json')
                .then(res => res.data[0]['data']['children'][0]['data']);
            if (!data) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            let embed = this.client.embeds
                .default()
                .setAuthor(`${data['title']}`, ICON, `https://reddit.com${data['permalink']}`)
                .setFooter(
                    `Author: ${data['author']}\u2000•\u2000Upvote ratio: ${
                        data['upvote_ratio'] * 100
                    }%`
                );
            if (data['url'].match('.jpg') || data['url'].match('.png')) embed.setImage(data['url']);
            else embed.setImage(data['url'] + '.jpg');
            return this.client.embeds
                .richDisplay({ removeOnly: true })
                .addPage(embed)
                .useCustomFooters()
                .run(
                    this.client,
                    message,
                    message, // await message.channel.send('Searching ...'),
                    '',
                    {
                        collectorTimeout: 180000,
                    }
                );
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
