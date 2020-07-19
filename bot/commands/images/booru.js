const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const he = require('he');
const { search, BooruError } = require('booru');
const { PREFIX } = process.env;

const protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;
const localhostDomainRE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/
const nonLocalhostDomainRE = /^[^\s\.]+\.\S{2,}$/;

function isUrl(string) {
    if (typeof string !== 'string') return false;
    const match = string.match(protocolAndDomainRE);
    if (!match) return false;
    const everythingAfterProtocol = match[1];
    if (!everythingAfterProtocol) return false;
    if (localhostDomainRE.test(everythingAfterProtocol) || nonLocalhostDomainRE.test(everythingAfterProtocol)) return true;
    return false;
}

module.exports = class Booru extends Command {
    constructor() {
        super('booru', {
            category: 'images',
            aliases: ['booru'],
            channel: 'guild',
            description: {
                content: `Fetch images from multiple booru sites by tags.\nRun ${PREFIX}booru for list of supported pages.`,
                usage: '<site> <tags>',
                examples: ['danbooru neko', 'gelbooru kitsune']
            },
            split: 'plain',
            args: [{
                id: 'site',
                type: [
                    ['e621', 'e6'],
                    ['e926', 'e9'],
                    ['hypnohub', 'hypno', 'hh'],
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
        if (!site) return message.channel.send(this.client.embeds('error', 'Unknown or unsupported site. Supported sites are: [e621](https://e621.net/), [e926](https://e926.net/), [hypnohub](https://hypnohub.net/), [danbooru](https://danbooru.donmai.us/), [konac (konachan.com)](https://konachan.com/), [konan (konachan.net)](https://konachan.net/), [yandere](https://yande.re/), [gelbooru](https://gelbooru.com/), [rule34](https://rule34.xxx/), [safebooru](https://safebooru.org/), [tbib](https://tbib.org/), [xbooru](https://xbooru.com/), [lolibooru](https://lolibooru.moe/), [paheal (rule34.paheal.net)](https://rule34.paheal.net/), [derpibooru](https://derpibooru.org/), [furrybooru](https://furry.booru.org/), [realbooru](https://realbooru.com/).'));
        tags = tags.split(' '); 
        search(site, tags, { limit: 3, random: true }).then(async res => {
            let data = res.posts;
            if (!data.length) return message.channel.send(this.client.embeds('error', 'Found nothing.'));
            data = data.filter(x => isUrl(x.fileUrl));
            if (!data.length) return message.channel.send(this.client.embeds('error', 'Found nothing.'));
            data = this.client.extensions.random(data);
            const image = data.fileUrl, tags = data.tags, original = data.postView;
            const embed = new MessageEmbed()
                .setDescription(`**Tags** : ${this.client.extensions.shorten(tags.map(x => `\`${he.decode(x).replace(/_/g, ' ')}\``).join('\u2000'), '\u2000')}\n\n[Original post](${original})\u2000•\u2000[Click here if image failed to load](${image})`)
                .setImage(image)
            this.client.embeds('display').addPage(embed).useCustomFooters().run(message, await message.channel.send('Searching ...'), ['images']);
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
