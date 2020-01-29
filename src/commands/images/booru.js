const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { search, BooruError } = require('booru');

module.exports = class Booru extends Command {
    constructor() {
        super('booru', {
            category: 'images',
            aliases: ['booru'],
            channel: 'guild',
            description: {
                content: 'Fetch images from multiple booru sites by tags.',
                usage: '<site> <tags>',
                examples: ['danbooru neko', 'gelbooru kitsune']
            },
            split: 'plain',
            args: [{
                id: 'site',
                type: [
                    ['e621', 'e6'],
                    ['e926', 'e9'],
                    ['hh', 'hypnohub', 'hypno'],
                    ['danbooru', 'dan', 'db'],
                    ['konac', 'kcom', 'kc'],
                    ['konan', 'knet', 'kn'],
                    ['yandere', 'yand', 'yd'],
                    ['gelbooru', 'gel', 'gb'],
                    ['rule34', 'r34'],
                    ['safebooru', 'safe', 'sb'],
                    ['tbib', 'tb'],
                    ['xbooru', 'xb'],
                    ['lolibooru', 'loli', 'lb'],
                    ['paheal', 'r34paheal', 'pa'],
                    ['derpibooru', 'derpi', 'dp'],
                    ['furrybooru', 'fb'],
                    ['realbooru', 'rb']
                ]
            },{
                id: 'tags',
                match: 'rest',
                default: ''
            }],
            cooldown: 3000
        });
    }

    exec(message, { site, tags }) {
        if (!site) return message.channel.send(this.client.embeds('error', 'Unknown or unsupported site. Supported sites are: [e621](https://e621.net/) [e926](https://e926.net/) [hypnohub](https://hypnohub.net/) [danbooru](https://danbooru.donmai.us/) [konac (konachan.com)](https://konachan.com/) [konan (konachan.net)](https://konachan.net/) [yandere](https://yande.re/) [gelbooru](https://gelbooru.com/) [rule34](https://rule34.xxx/) [safebooru](https://safebooru.org/) [tbib](https://tbib.org/) [xbooru](https://xbooru.com/) [lolibooru](https://lolibooru.moe/) [paheal (rule34.paheal.net)](https://rule34.paheal.net/) [derpibooru](https://derpibooru.org/) [furrybooru](https://furry.booru.org/) [realbooru](https://realbooru.com/)'));
        tags = tags.split(' ');
        search(site, tags, { limit: 1, random: true }).then(res => {
            const data = res.posts[0];
            if (!data) return message.channel.send(this.client.embeds('error', 'Found nothing.'));
            const image = data.fileUrl, tags = data.tags;
            const embed = new MessageEmbed()
                .setDescription(`**Tags** : ${tags.map(x => `\`${x}\``).join(' ')}\n\n[Click here if image failed to load](${image})`)
                .setImage(image)
            this.client.embeds('display').addPage(embed).useCustomFooters().run(message, ['images']);
        }).catch(err => {
            if (err instanceof BooruError) {
                this.client.logger.error(err.message);
                return message.channel.send(this.client.embeds('error'));
            } else {
                this.client.logger.error(err);
                return message.channel.send(this.client.embeds('error'));
            }
        })
    }
};
