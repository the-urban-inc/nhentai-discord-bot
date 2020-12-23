import Command from '@inari/struct/bot/Command';
import { Message } from 'discord.js';
import he from 'he';
import { Server } from '@inari/models/server';
import { FLAG_EMOJIS, SORT_METHODS, BANNED_TAGS, BLOCKED_MESSAGE } from '@inari/utils/constants';

export default class extends Command {
    constructor() {
        super('search', {
            aliases: ['search'],
            channel: 'guild',
            nsfw: true,
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
        });
    }

    danger = false;
    warning = false;

    async before(message: Message) {
        try {
            let server = await Server.findOne({ serverID: message.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    settings: { danger: false },
                }).save();
            }
            this.danger = server.settings.danger;
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
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
            const data = await this.client.nhentai.search(text, pageNum, sort);

            if (!data.results.length)
                return message.channel.send(this.client.embeds.clientError('No results found.'));

            if (!pageNum || isNaN(pageNum) || pageNum < 1 || pageNum > data.num_pages)
                return message.channel.send(
                    this.client.embeds.clientError(
                        'Page number is not an integer or is out of range.'
                    )
                );

            const display = this.client.embeds
                .richDisplay({ info: true, download: true })
                .useCustomFooters();
            for (const [
                idx,
                { title, id, language, dataTags, thumbnail },
            ] of data.results.entries()) {
                const epage = this.client.util
                    .embed()
                    .setTitle(`${he.decode(title)}`)
                    .setURL(`https://nhentai.net/g/${id}`)
                    .setDescription(
                        `**ID** : ${id}\u2000•\u2000**Language** : ${
                            FLAG_EMOJIS[language as keyof typeof FLAG_EMOJIS] || 'N/A'
                        }`
                    )
                    .setFooter(
                        `Doujin ${idx + 1} of ${data.results.length}\u2000•\u2000Page ${page} of ${
                            data.num_pages || 1
                        }\u2000•\u2000Found ${data.num_results} result(s)`
                    )
                    .setTimestamp();
                const prip = this.client.util.hasCommon(dataTags, BANNED_TAGS);
                if (prip) this.warning = true;
                if (this.danger || !prip) epage.setImage(thumbnail.s);
                display.addPage(epage, id);
            }
            await display.run(this.client, message, await message.channel.send('Searching ...'), '', {
                idle: 300000,
            });

            if (!this.danger && this.warning) {
                return this.client.embeds
                    .richDisplay({ image: true, removeRequest: false })
                    .addPage(this.client.embeds.clientError(BLOCKED_MESSAGE))
                    .useCustomFooters()
                    .run(this.client, message, await message.channel.send('Loading ...'), '', {
                        time: 300000,
                    });
            }
        } catch (err) {
            this.client.logger.error(err);
            return message.channel.send(this.client.embeds.internalError(err));
        }
    }
}
