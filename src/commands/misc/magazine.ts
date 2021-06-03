import { Command } from '@structures';
import { Message } from 'discord.js';

const ICON = 'https://awa-con.com/wp-content/uploads/2019/10/FAKKU.png';

export default class extends Command {
    constructor() {
        super('magazine', {
            aliases: ['magazine'],
            nsfw: true,
            cooldown: 30000,
            description: {
                content: 'Searches for magazines on Fakku.',
                examples: [
                    ' Comic Kairakuten\nSearches for releases of Comic Kairakuten on [Fakku](https://fakku.net).',
                ],
                additionalInfo:
                    "Creator's Note: This is an experimental command. Thus, anything can change, including the deletion of this command.",
            },
            error: {
                'No Result': {
                    message: 'No result found!',
                    example: 'Try again with a different query.',
                },
                'Invalid Query': {
                    message: 'Please provide a magazine name!',
                    example: ' Comic Kairakuten\nto search for Comic Kairakuten releases.',
                },
            },
            args: [
                {
                    id: 'query',
                    type: 'string',
                    match: 'content',
                },
            ],
        });
    }

    async exec(message: Message, { query }: { query: string }) {
        try {
            if (!query) {
                return this.client.commandHandler.emitError(
                    new Error('Invalid Query'),
                    message,
                    this
                );
            }
            const magazines = this.client.fakku.findMagazine(query);
            if (!magazines || !magazines.length) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            if (magazines[0].score < 0.1) {
                const { title, url, image } = magazines[0].item;
                const magazine = await this.client.fakku.fetchSingleMagazine(url);
                const { publisher, coverIllust, artists, doujins } = magazine;
                const info = this.client.embeds
                    .default()
                    .setTitle(title)
                    .setURL(`https://fakku.net${url}`)
                    .setThumbnail(image)
                    .setTimestamp();
                if (publisher.length) {
                    info.setDescription(
                        `${publisher}\n\n**Cover Illustration**: ${coverIllust}\n\n**Artists**: ${artists}`
                    );
                }
                const display = this.client.embeds.richDisplay({ love: false }).setInfoPage(info);
                if (!doujins || !doujins.length) return message.channel.send(info);
                for (const { title, artist, thumbnail, description, price, tags } of doujins) {
                    const info = this.client.embeds
                        .default()
                        .setAuthor(artist.name, ICON, `https://fakku.net${artist.href}`)
                        .setTitle(title.name)
                        .setURL(`https://fakku.net${title.href}`)
                        .setThumbnail('https:' + thumbnail)
                        .setDescription(this.client.util.shorten(description, '\n', 2000));
                    if (price.length) info.addField('Price', price);
                    info.addField(
                        'Tags',
                        this.client.util.gshorten(
                            tags.map((d: { name: string; href: string }) => `\`${d.name}\``)
                        )
                    ).setTimestamp();
                    display.addPage(info);
                }
                return await display.run(
                    this.client,
                    message,
                    message,
                    `> **Fakku Search Result • [** ${message.author.tag} **]**`,
                    {
                        collectorTimeout: 300000,
                    }
                );
            }
            let desc = magazines
                .slice(0, 10)
                .map(({ item: { title, url } }) => `• [${title}](https://fakku.net${url})`)
                .join('\n');
            if (magazines.length > 10) desc += `\n... and ${magazines.length - 10} more result(s)`;
            message.channel.send(`> **Fakku Search Result • [** ${message.author.tag} **]**`, {
                embed: this.client.embeds
                    .default()
                    .setTitle('Magazines List')
                    .setDescription(desc)
                    .setTimestamp(),
            });
        } catch (err) {
            this.client.logger.error(err);
        }
    }
}
