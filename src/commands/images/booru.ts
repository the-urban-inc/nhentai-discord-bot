import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import he from 'he';
import { search } from 'booru';

const PROTOCOL_AND_DOMAIN_RE = /^(?:\w+:)?\/\/(\S+)$/;
const LOCALHOST_DOMAIN_RE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
const NON_LOCALHOST_DOMAIN_RE = /^[^\s\.]+\.\S{2,}$/;

function isUrl(s: string) {
    if (typeof s !== 'string') return false;
    const match = s.match(PROTOCOL_AND_DOMAIN_RE);
    if (!match) return false;
    const everythingAfterProtocol = match[1];
    if (!everythingAfterProtocol) return false;
    if (
        LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol) ||
        NON_LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol)
    )
        return true;
    return false;
}

const SITES = {
    e621: ['e6'],
    e926: ['e9'],
    hypnohub: ['hypno', 'hh'],
    danbooru: ['dan', 'db'],
    konac: ['kcom', 'kc'],
    konan: ['knet', 'kn'],
    yandere: ['yand', 'yd'],
    gelbooru: ['gel', 'gb'],
    rule34: ['r34'],
    safebooru: ['safe', 'sb'],
    tbib: ['tb'],
    xbooru: ['xb'],
    lolibooru: ['loli', 'lb'],
    paheal: ['r34paheal', 'pa'],
    derpibooru: ['derpi', 'dp'],
    furrybooru: ['fb'],
    realbooru: ['rb'],
};

export default class extends Command {
    constructor() {
        super('booru', {
            aliases: Object.keys(SITES).concat(...Object.values(SITES)),
            areMultipleCommands: true,
            subAliases: SITES,
            channel: 'guild',
            nsfw: true,
            description: {
                content: `Fetch images from @ by tags.`,
                usage: '<tags>',
            },
            args: [
                {
                    id: 'tags',
                    match: 'rest',
                    default: '',
                },
            ],
        });
    }

    exec(message: Message, { tags }: { tags: string }) {
        type _ = keyof typeof SITES;
        const site = message.util?.parsed?.alias as _ | typeof SITES[_][number];
        if (!site) {
            return message.channel.send(
                this.client.embeds.clientError(
                    'Unknown or unsupported site. Supported sites are: [e621](https://e621.net/), [e926](https://e926.net/), [hypnohub](https://hypnohub.net/), [danbooru](https://danbooru.donmai.us/), [konac (konachan.com)](https://konachan.com/), [konan (konachan.net)](https://konachan.net/), [yandere](https://yande.re/), [gelbooru](https://gelbooru.com/), [rule34](https://rule34.xxx/), [safebooru](https://safebooru.org/), [tbib](https://tbib.org/), [xbooru](https://xbooru.com/), [lolibooru](https://lolibooru.moe/), [paheal (rule34.paheal.net)](https://rule34.paheal.net/), [derpibooru](https://derpibooru.org/), [furrybooru](https://furry.booru.org/), [realbooru](https://realbooru.com/).'
                )
            );
        }
        let tagsArray = tags.split(' ');
        search(site, tagsArray, { limit: 3, random: true })
            .then(async res => {
                let dataPosts = res.posts;
                if (!dataPosts.length)
                    return message.channel.send(
                        this.client.embeds.clientError('No results found.')
                    );
                dataPosts = dataPosts.filter(x => isUrl(x.fileUrl));
                if (!dataPosts.length)
                    return message.channel.send(
                        this.client.embeds.clientError('No results found.')
                    );
                let data = this.client.util.random(dataPosts);
                const image = data.fileUrl,
                    tags = data.tags,
                    original = data.postView;
                const embed = this.client.util
                    .embed()
                    .setDescription(
                        `**Tags** : ${this.client.util.shorten(
                            tags
                                .map((x: string) => `\`${he.decode(x).replace(/_/g, ' ')}\``)
                                .join('\u2000'),
                            '\u2000'
                        )}\n\n[Original post](${original})\u2000•\u2000[Click here if image failed to load](${image})`
                    )
                    .setImage(image);
                return this.client.embeds
                    .richDisplay({ image: true })
                    .addPage(embed)
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Searching ...'), '', {
                        time: 180000,
                    });
            })
            .catch(err => {
                this.client.logger.error(err);
                return message.channel.send(this.client.embeds.internalError(err));
            });
    }
}
