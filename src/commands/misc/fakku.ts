import { Command } from '@structures';
import { Message } from 'discord.js';
import { URL } from 'url';
import googleIt from 'google-it';

const ICON = 'https://awa-con.com/wp-content/uploads/2019/10/FAKKU.png';

export default class extends Command {
    constructor() {
        super('fakku', {
            aliases: ['fakku'],
            nsfw: true,
            cooldown: 30000,
            description: {
                content: 'Searches for doujins on Fakku.',
                examples: [
                    ' Metamorphosis\nSearches for doujins on [Fakku](https://fakku.net) with titles containing the keyword `Metamorphosis` (up to 5 results).',
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
                    message: 'Please provide a doujin name!',
                    example:
                        ' Metamorphosis\nto search for doujins with titles containing the keyword `Metamorphosis` (up to 5 results).',
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
            const consoleLog = console.log;
            console.log = function () {};
            const results: { link: string }[] = await googleIt({
                query,
                limit: 25,
                'only-urls': true,
                includeSites: 'https://fakku.net/hentai',
            }).catch((err: Error) => this.client.logger.error(err));
            console.log = consoleLog;
            const filtered = results
                .map(r => new URL(r.link))
                .filter(l => l.pathname.split('/').length === 3)
                .slice(0, 5);
            const doujins = await Promise.all(
                filtered.map(async res => {
                    return {
                        url: res.toString(),
                        data: await this.client.fakku.doujin(res.pathname),
                    };
                })
            );
            if (!doujins || !doujins.length) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const display = this.client.embeds.richDisplay({ love: false });
            for (const { url, data: doujin } of doujins) {
                const { title, thumbnail } = doujin;
                const info = this.client.embeds
                    .default()
                    .setAuthor(title, ICON, url)
                    .setThumbnail(thumbnail)
                    .setTimestamp();
                Object.keys(doujin).forEach(t => {
                    if (t === 'title' || t === 'thumbnail') return;
                    info.addField(
                        this.client.util.capitalize(t),
                        typeof doujin[t] === 'string'
                            ? this.client.util.shorten(doujin[t], '\n', 1000)
                            : Array.isArray(doujin[t])
                            ? this.client.util.gshorten(
                                  doujin[t].map((d: { name: string; href: string }) =>
                                      t === 'tags'
                                          ? `\`${d.name}\``
                                          : `[${d.name}](https://fakku.net${d.href})`
                                  )
                              )
                            : `[${doujin[t].name}](https://fakku.net${doujin[t].href})`,
                        t !== 'description' && t !== 'tags'
                    );
                });
                display.addPage(info);
            }
            await display.run(
                this.client,
                message,
                message,
                `> **Fakku Search Result • [** ${message.author.tag} **]**`,
                {
                    collectorTimeout: 300000,
                }
            );
        } catch (err) {
            this.client.logger.error(err);
        }
    }
}
