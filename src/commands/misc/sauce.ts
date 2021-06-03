import { Command } from '@structures';
import { Message, TextChannel } from 'discord.js';
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
                    '\nYou can also attach image, or reply to a message that contains attachment(s). Note that it will only search for the first image attachment.',
                ],
                additionalInfo:
                    "Recommend using a full picture for best result. Cropped search rarely gives you the correct link.",
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

    async getReference(message: Message) {
        const { channelID, messageID } = message.reference;
        return ((await this.client.channels.fetch(channelID)) as TextChannel).messages.fetch(
            messageID
        );
    }

    checkforImage(message: Message) {
        return message.attachments
            .array()
            .filter(a =>
                ['png', 'gif', 'jpg', 'jpeg', 'webp'].includes(a.url.split('.').reverse()[0])
            );
    }

    async exec(
        message: Message,
        {
            query,
            tag,
            users,
            removeRequest,
        }: { query: string; tag: string; users: string[]; removeRequest: boolean }
    ) {
        try {
            const referencedMessage = message.reference
                ? await this.getReference(message)
                : message;
            if (!query && !message.attachments.size && !referencedMessage.attachments.size) {
                return this.client.commandHandler.emitError(
                    new Error('Invalid Query'),
                    message,
                    this
                );
            }
            const url =
                query ??
                this.checkforImage(message)[0]?.url ??
                this.checkforImage(referencedMessage)[0]?.url;
            if (!this.client.util.isUrl(url)) {
                return this.client.commandHandler.emitError(
                    new Error('Invalid Query'),
                    message,
                    this
                );
            }
            const results = await sauceNAO(url, { results: 8, db: 999 });
            if (!results || !results.length) {
                return this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
            const display = this.client.embeds.richDisplay({ love: false, removeRequest });
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
                            ? `${data.source}${
                                  (data as any).part ? ` - ${(data as any).part}` : ''
                              }`
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
                            ? `[${data.pawoo_id}](https://pawoo.net/@${
                                  (data as any).pawoo_user_acct
                              }/${data.pawoo_id})`
                            : data.pawoo_id
                    );
                }
                if (data.nijie_id) {
                    info.addField(
                        'Nijie ID',
                        `[${data.nijie_id}](https://nijie.info/view.php?id=${data.nijie_id})`
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
                    (data.member_name ? `${data.member_name} (${data.member_id})` : 'Unknown') ??
                    'Unknown';
                if (authorUrl) author = `[${author}](${authorUrl})`;
                if ((data as any).pawoo_user_acct) {
                    author = `[${author}](https://pawoo.net/@${(data as any).pawoo_user_acct})`;
                }
                if (![21, 22, 25].includes(index)) {
                    let field = 'Creator';
                    switch (index) {
                        case 5:
                            field = 'Member';
                            break;
                        case 11:
                            field = 'Member';
                            author = data.member_name
                                ? `[${data.member_name}](https://nijie.info/members.php?id=${data.member_id})`
                                : 'Unknown';
                            break;
                        case 35:
                            field = 'Author';
                            author = `@${(data as any).pawoo_user_username}` ?? author;
                            break;
                    }
                    info.addField(field, author.length ? author : 'Unknown');
                }
                if (data.source && data.source.length) {
                    info.addField('Source', data.source ?? 'Unknown');
                }
                if ((data as any).material && (data as any).material.length) {
                    info.addField('Material', (data as any).material ?? 'Unknown');
                }
                if ((data as any).characters && (data as any).characters.length) {
                    info.addField('Characters', (data as any).characters ?? 'Unknown');
                }
                if ((data as any).est_time && (data as any).est_time.length) {
                    info.addField('Est Time', (data as any).est_time ?? 'Unknown');
                }
                display.addPage(info);
            }
            return await display.run(
                this.client,
                message,
                message,
                `> **SauceNAO Search Result • [** ${tag ?? message.author.tag} **]**`,
                {
                    users,
                    collectorTimeout: 300000,
                }
            );
        } catch (err) {
            this.client.logger.error(err);
            if (err.constructor.name === 'SagiriClientError') {
                this.client.commandHandler.emitError(new Error('No Result'), message, this);
            }
        }
    }
}
