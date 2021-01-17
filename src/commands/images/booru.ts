import { Command } from '@structures';
import { Message } from 'discord.js';
import he from 'he';
import { search } from 'booru';

const SITES = {
    e621: {
        aliases: ['e6'],
        description: 'Shows a random post with given tag from e621.net.',
        examples: [
            ' mammal\nShows a post with tag `mammal`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'Mission: To archive the best/strangest/most excellent animal/anthro-related artwork, **regardless of content**, for all those who wish to view it.'
    },
    e926: {
        aliases: ['e9'],
        description: 'Shows a random post with given tag from e926.net.',
        examples: [
            ' mammal\nShows a post with tag `mammal`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'Mission: To archive the best/strangest/most excellent animal/anthro-related artwork, **regardless of content**, for all those who wish to view it.'
    },
    hypnohub: {
        aliases: ['hypno', 'hh'],
        description: 'Shows a random post with given tag from hypnohub.net.',
        examples: [
            ' femsub\nShows a post with tag `femsub`.',
            '\nThis will show a random post with any tag.',
        ],
    },
    danbooru: {
        aliases: ['dan', 'db'],
        description: 'Shows a random post with given tag from danbooru.donmai.us.',
        examples: [
            ' 1girl\nShows a post with tag `1girl`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'Danbooru [dahn-boh-ruh] (noun):\n1. (_on donmai.us_) A repository of high-quality anime-style art and doujinshi.\n2. A taggable imageboard, with sophisticated features for keeping, organizing and finding pictures.\n3. (_Japanese_) Corrugated cardboard box.'
    },
    konac: {
        aliases: ['kcom', 'kc'],
        description: 'Shows a random post with given tag from konachan.com.',
        examples: [
            ' long_hair\nShows a post with tag `long hair`.',
            '\nThis will show a random post with any tag.',
        ],
    },
    konan: {
        aliases: ['knet', 'kn'],
        description: 'Shows a random post with given tag from konachan.net.',
        examples: [
            ' long_hair\nShows a post with tag `long hair`.',
            '\nThis will show a random post with any tag.',
        ],
    },
    yandere: {
        aliases: ['yand', 'yd'],
        description: 'Shows a random post with given tag from yande.re.',
        examples: [
            ' thighhighs\nShows a post with tag `thighhighs`.',
            '\nThis will show a random post with any tag.',
        ],
    },
    gelbooru: {
        aliases: ['gel', 'gb'],
        description: 'Shows a random post with given tag from gelbooru.com.',
        examples: [
            ' 1girl\nShows a post with tag `1girl`.',
            '\nThis will show a random post with any tag.',
        ],
    },
    rule34: {
        aliases: ['r34'],
        description:
            'Shows a random post with given tag from rule34.xxx.',
        examples: [
            ' female\nShows a post with tag `female`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'Rule#34 : If it exists there is porn of it. If not, start uploading.'
    },
    safebooru: {
        aliases: ['safe', 'sb'],
        description: 'Shows a random post with given tag from safebooru.org.',
        examples: [
            ' 1girl\nShows a post with tag `1girl`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'Safebooru: An offspring of Gelbooru hosted by a different person but running the same software. Safebooru has been created after danbooru dropped the project.'
    },
    tbib: {
        aliases: ['tb', 'big'],
        description:
            'Shows a random post with given tag from tbib.org.',
        examples: [
            ' 1girl\nShows a post with tag `1girl`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'TBIB: Stands for The Big Image Board.'
    },
    xbooru: {
        aliases: ['xb'],
        description: 'Shows a random post with given tag from xbooru.com.',
        examples: [
            ' 1girl\nShows a post with tag `1girl`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'X marks the spot.'
    },
    paheal: {
        aliases: ['pa'],
        description:
            'Shows a random post with given tag from rule34.paheal.net.',
        examples: [
            ' Porkyman\nShows a post with tag `Porkyman`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'Currently broken.'
    },
    derpibooru: {
        aliases: ['derpi', 'dp', 'derp'],
        description: 'Shows a random post with given tag from derpibooru.org.',
        examples: [
            ' safe\nShows a post with tag `safe`.',
            '\nThis will show a random post with any tag.',
        ],
        additionalInfo: 'Derpibooru: An image repository which lets people bring together art from all over the internet, annotate the images with tags and an original source URL for easy searching, and discuss the artwork.'
    },
};

export default class extends Command {
    constructor() {
        super('booru', {
            aliases: Object.keys(SITES).concat(...Object.values(SITES).map(x => x.aliases)),
            subAliases: SITES,
            channel: 'guild',
            nsfw: true,
            description: {
                usage: '[tags]',
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
        const site = message.util?.parsed?.alias as _ | typeof SITES[_]['aliases'][number];
        if (!site) {
            return message.channel.send(
                this.client.embeds.clientError(
                    'Unknown or unsupported site. Supported sites are: [e621](https://e621.net/), [e926](https://e926.net/), [hypnohub](https://hypnohub.net/), [danbooru](https://danbooru.donmai.us/), [konac (konachan.com)](https://konachan.com/), [konan (konachan.net)](https://konachan.net/), [yandere](https://yande.re/), [gelbooru](https://gelbooru.com/), [rule34](https://rule34.xxx/), [safebooru](https://safebooru.org/), [tbib](https://tbib.org/), [xbooru](https://xbooru.com/), [paheal (rule34.paheal.net)](https://rule34.paheal.net/), [derpibooru](https://derpibooru.org/).'
                )
            );
        }
        let tagsArray = tags.split(' ');
        search(site, tagsArray, { limit: 25, random: true }) // 25 is more than enough for a page
            .then(async res => {
                let dataPosts = res.posts;
                if (!dataPosts.length) {
                    return message.channel.send(
                        this.client.embeds.clientError('No results found.')
                    );
                }
                dataPosts = dataPosts.filter(x => this.client.util.isUrl(x.fileUrl));
                if (!dataPosts.length) {
                    return message.channel.send(
                        this.client.embeds.clientError('No results found.')
                    );
                }
                const display = this.client.embeds.richDisplay({ love: false }).useCustomFooters();
                dataPosts.forEach((data, idx) => {
                    const image = data.fileUrl,
                        tags = data.tags,
                        original = data.postView;
                    display.addPage(
                        this.client.util
                            .embed()
                            .setDescription(
                                `**Tags** : ${this.client.util.shorten(
                                    tags
                                        .map(
                                            (x: string) => `\`${he.decode(x).replace(/_/g, ' ')}\``
                                        )
                                        .join('\u2000'),
                                    '\u2000'
                                )}\n\n[Original post](${original})\u2000•\u2000[Click here if image failed to load](${image})`
                            )
                            .setImage(image)
                            .setFooter(`Post ${idx + 1} of ${dataPosts.length}`)
                    );
                });
                return display.run(
                    this.client,
                    message,
                    await message.channel.send('Searching ...'),
                    '',
                    {
                        time: 180000,
                    }
                );
            })
            .catch(err => {
                this.client.logger.error(err);
                return message.channel.send(this.client.embeds.internalError(err));
            });
    }
}
