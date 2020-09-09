import Command from '@nhentai/struct/bot/Command';
import { Message } from 'discord.js';
import axios from 'axios';
import moment from 'moment';
const { TWITTER_API_KEY, TWITTER_SECRET } = process.env;

const ICON = 'https://vgy.me/8tgKd0.png';

export default class extends Command {
    token: string;

    constructor() {
        super('twitter', {
            aliases: ['twitter', 'tweet'],
            description: {
                content: "Maou's latest tweet.",
            },
        });

        this.token = '';
    }

    async exec(message: Message) {
        try {
            if (!this.token) await this.fetchToken();
            const data = await axios({
                url: 'https://api.twitter.com/1.1/users/show.json?screen_name=fuckmaou',
                headers: { Authorization: `Bearer ${this.token}` },
            }).then(res => res.data);
            if (!data) throw new Error('No results found.');
            let embed = this.client.util
                .embed()
                .setAuthor('Latest Tweet', ICON)
                .setTitle(`${data.name} (@${data.screen_name})`)
                .setURL(`https://twitter.com/${data.screen_name}`)
                .setDescription(data.status.text)
                .setImage(data.profile_background_image_url_https)
                .setThumbnail(data.profile_image_url_https);
            if (data.status.retweeted_status)
                embed.setFooter(
                    `Retweeted ${moment(new Date(data.status.created_at)).fromNow()} • ${
                        data.status.retweeted_status.retweet_count
                    } Retweet(s) • ${data.status.retweeted_status.favorite_count} Like(s)`
                );
            else if (data.status.retweeted_status)
                embed.setFooter(
                    `Posted ${moment(new Date(data.status.created_at)).fromNow()} • ${
                        data.status.retweet_count
                    } Retweet(s) • ${data.status.favorite_count} Like(s)`
                );
            return message.channel.send(embed);
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }

    async fetchToken() {
        this.token = await axios({
            method: 'post',
            url: 'https://api.twitter.com/oauth2/token',
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${TWITTER_API_KEY}:${TWITTER_SECRET}`
                ).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            data: 'grant_type=client_credentials',
        }).then(res => res.data.access_token);
    }
}
