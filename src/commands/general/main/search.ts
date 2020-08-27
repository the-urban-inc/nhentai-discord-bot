import Command from '@nhentai/struct/bot/Command';
import { Message, MessageEmbed } from 'discord.js';
import he from 'he';
import { FLAG_EMOJIS, SORT_METHODS } from '@nhentai/utils/constants';

export default class extends Command {
    constructor() {
        super('search', {
            category: 'general',
            aliases: ['search'],
            description: {
                content: [
                    'Searches nhentai for given query.',
                    '• You can search for multiple terms at the same time, and this will return only galleries that contain both terms. For example, `anal tanlines` finds all galleries that contain both `anal` and `tanlines`.',
                    '• You can exclude terms by prefixing them with `-`. For example, `anal tanlines -yaoi` matches all galleries matching `anal` and `tanlines` but not `yaoi`.',
                    '• Exact searches can be performed by wrapping terms in double quotes. For example, `"big breasts"` only matches galleries with "big breasts" somewhere in the title or in tags.',
                    '• These can be combined with tag namespaces for finer control over the query: `parodies:railgun -tag:"big breasts"`.',
                    '• You can search for galleries with a specific number of pages with `pages:20`, or with a page range: `pages:>20 pages:<=30`.',
                    '• You can search for galleries uploaded within some timeframe with `uploaded:20d`. Valid units are `h`, `d`, `w`, `m`, `y`. You can use ranges as well: `uploaded:>20d uploaded:<30d`.',
                ],
                usage: `<text> [--page=pagenum] [--sort=(${SORT_METHODS.join('/')})]`,
            },
            args: [
                {
                    id: 'text',
                    type: 'string',
                    match: 'text',
                },
                {
                    id: 'page',
                    match: 'option',
                    flag: ['--page=', '-p='],
                    default: '1',
                },
                {
                    id: 'sort',
                    match: 'option',
                    flag: ['--sort=', '-s='],
                    default: 'recent',
                },
            ],
            cooldown: 3000,
        });
    }

    async exec(
        message: Message,
        { text, page, sort }: { text: string; page: string; sort: string }
    ) {
        try {
            if (!text)
                return message.channel.send(
                    this.client.embeds.clientError('Search text is not specified.')
                );
            if (!SORT_METHODS.includes(sort))
                return message.channel.send(
                    this.client.embeds.clientError(
                        `Invalid sort method provided. Available methods are: ${SORT_METHODS.map(
                            s => `\`${s}\``
                        ).join(', ')}.`
                    )
                );
            let pageNum = parseInt(page, 10);
            const data = await this.client.nhentai
                .search(text, pageNum, sort);
            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > data.num_pages)
                return message.channel.send(
                    this.client.embeds.clientError('Page number is not an integer or is out of range.')
                );
            if (!data.results.length)
                return message.channel.send(this.client.embeds.clientError('No results found.'));
            const display = this.client.embeds.richDisplay().useCustomFooters();
            for (const [idx, doujin] of data.results.entries()) {
                display.addPage(
                    new MessageEmbed()
                        .setTitle(`${he.decode(doujin.title)}`)
                        .setURL(`https://nhentai.net/g/${doujin.id}`)
                        .setDescription(
                            `**ID** : ${doujin.id}\u2000•\u2000**Language** : ${
                                FLAG_EMOJIS[doujin.language as keyof typeof FLAG_EMOJIS] || 'N/A'
                            }`
                        )
                        .setImage(doujin.thumbnail.s)
                        .setFooter(
                            `Doujin ${idx + 1} of ${data.results.length} • Page ${page} of ${
                                data.num_pages || 1
                            } • Found ${data.num_results} result(s)`
                        )
                        .setTimestamp(),
                    doujin.id
                );
            }
            return display.run(await message.channel.send('Searching ...'));
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
