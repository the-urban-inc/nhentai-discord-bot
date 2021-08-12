import { Client, ContextMenuCommand, UserError } from '@structures';
import { ContextMenuInteraction, Message } from 'discord.js';
import sagiri from 'sagiri';
const sauceNAO = sagiri(process.env.SAUCENAO_TOKEN);

export default class extends ContextMenuCommand {
    constructor(client: Client) {
        super(client, {
            name: 'saucenao',
            type: 'MESSAGE',
            cooldown: 10000,
            nsfw: true,
        });
    }

    checkforImage(message: Message) {
        return Array.from(message.attachments.values()).filter(a =>
            ['png', 'gif', 'jpg', 'jpeg', 'webp'].includes(a.url.split('.').reverse()[0])
        );
    }

    async exec(interaction: ContextMenuInteraction) {
        const message = interaction.options.getMessage('message') as Message;
        if (!message.content && !message.attachments.size) {
            throw new UserError('NO_IMAGE');
        }
        const imageURL = message.content.length
            ? message.content
            : this.checkforImage(message)[0]?.url;
        if (!this.client.util.isUrl(imageURL)) {
            throw new UserError('INVALID_IMAGE', imageURL);
        }
        const results = await sauceNAO(imageURL, { results: 8, db: 999 });
        if (!results || !results.length) {
            throw new UserError('NO_RESULT', imageURL);
        }
        const display = this.client.embeds.paginator(this.client, {
            startView: 'thumbnail',
            collectorTimeout: 300000,
            image: imageURL,
        });
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
                .setDescription(`[Original Image](${imageURL})`)
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
            if (Array.isArray(author)) author = author.join(', ');
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
            display.addPage('thumbnail', { embed: info });
        }
        return await display.run(
            interaction,
            `> **SauceNAO Search Result • [** ${message.author.tag} **]**`
        );
    }
}
