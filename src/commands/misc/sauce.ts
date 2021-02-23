import { Command } from '@structures';
import { Message } from 'discord.js';
import sagiri from 'sagiri';
const sauceNAO = sagiri(process.env.SAUCENAO_TOKEN);

export default class extends Command {
    constructor() {
        super('sauce', {
            aliases: ['sauce', 'saucenao'],
            nsfw: true,
            cooldown: 10000,
            description: {
                content: 'Searches for image sauce by SauceNAO.',
                examples: [
                    ' https://i.imgur.com/5yFTeRV.png\nSearches for sauce of the provided image link.',
                ],
                additionalInfo:
                    "Recommend using a full picture for best result. Screenshot search rarely gives you the correct link.\n\nCreator's Note: This is an experimental command. Thus, anything can change, including the deletion of this command.",
            },
            error: {
                'No Result': {
                    message: 'No result found!',
                    example: 'Try again with a different image link.',
                },
                'Invalid Query': {
                    message: 'Please provide a working image link!',
                    example:
                        ' https://i.imgur.com/5yFTeRV.png\nto search for sauce of the provided image link.',
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
            if (!query || !this.client.util.isUrl(query)) {
                return this.client.commandHandler.emitError(new Error('Invalid Query'), message, this);
            }
            const results = await sauceNAO(query, { results: 8, db: 999 });
            if (!results || !results.length) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const display = this.client.embeds.richDisplay({ love: false });
            for (const {
                url,
                site,
                index,
                similarity,
                thumbnail,
                authorName,
                authorUrl,
                raw: { data },
            } of results) {
                const info = this.client.embeds
                    .default()
                    .setTitle(
                        index === 21
                            ? `${data.source}${(data as any).part ? ` - ${(data as any).part}` : ''}`
                            : data.title ?? (data as any).created_at ?? `Image from ${site}`
                    )
                    .setURL(url)
                    .setThumbnail(encodeURI(thumbnail))
                    .addField('Similarity', `${similarity}%`);
                if (data.pixiv_id) {
                    info.addField(
                        'Pixiv ID',
                        `[${data.pixiv_id}](https://www.pixiv.net/en/artworks/${data.pixiv_id})`
                    );
                }
                if (data.pawoo_id) {
                    info.addField(
                        'Pawoo ID',
                        (data as any).pawoo_user_acct
                            ? `[${data.pawoo_id}](https://pawoo.net/@${(data as any).pawoo_user_acct}/${
                                data.pawoo_id
                            })`
                            : data.pawoo_id
                    );
                }
                if (data.da_id) {
                    info.addField(
                        'dA ID',
                        `[${data.da_id}](https://deviantart.com/view/${data.da_id})`
                    );
                }
                let author =
                    authorName ??
                    (data as any).creator ??
                    `@${(data as any).pawoo_user_username}` ??
                    (data.member_name ? `${data.member_name} (${data.member_id})` : 'Unknown');
                if (authorUrl) author = `[${author}](${authorUrl})`;
                if ((data as any).pawoo_user_acct)
                    author = `[${author}](https://pawoo.net/@${(data as any).pawoo_user_acct})`;
                if (index !== 21) {
                    info.addField(
                        site === 'Pixiv' ? 'Member' : site === 'Pawoo' ? 'Author' : 'Creator',
                        author
                    );
                }
                if (data.source && index !== 21) info.addField('Source', data.source);
                if ((data as any).material) info.addField('Material', (data as any).material);
                if ((data as any).characters) info.addField('Characters', (data as any).characters);
                if ((data as any).est_time) info.addField('Est Time', (data as any).est_time);
                display.addPage(info);
            }
            await display.run(
                this.client,
                message,
                message,
                `> **SauceNAO Search Result • [** ${message.author.tag} **]**`,
                {
                    idle: 300000,
                }
            );
        } catch (err) {
            this.client.logger.error(err);
            if (err.constructor.name === 'SagiriClientError') {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
        }
    }
}
