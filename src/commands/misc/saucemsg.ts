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
            a.contentType.startsWith('image')
        );
    }

    checkforEmbedImage(message: Message) {
        return message.embeds.filter(e => e.image || e.thumbnail).map(e => e.image ?? e.thumbnail);
    }

    async exec(interaction: ContextMenuInteraction) {
        const message = interaction.options.getMessage('message') as Message;
        if (!message.content && !message.attachments.size) {
            throw new UserError('NO_IMAGE');
        }
        const images = [message.content, this.checkforImage(message)[0]?.url, this.checkforEmbedImage(message)[0]?.url].filter(url => this.client.util.isUrl(url))
        if (!images.length) throw new UserError('INVALID_IMAGE', '');
        const imageURL = images[0];
        let results = await sauceNAO(imageURL, { db: 999 });
        if (!results || results.length === 0) {
            throw new UserError('NO_RESULT', imageURL);
        }
        results = results.slice(0, 8);
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
                .addFields([{ name: 'Similarity', value: `${similarity}%` }]);
            if (data.pixiv_id) {
                info.addFields({
                    name: 'Pixiv ID',
                    value: `[${data.pixiv_id}](https://www.pixiv.net/en/artworks/${data.pixiv_id})`
                });
            }
            if (data.pawoo_id) {
                info.addFields(
                    {
                        name: 'Pawoo ID',
                        value: (data as any).pawoo_user_acct
                            ? `[${data.pawoo_id}](https://pawoo.net/@${(data as any).pawoo_user_acct}/${data.pawoo_id})`
                            : data.pawoo_id
                    }
                );
            }
            if (data.nijie_id) {
                info.addFields(
                    {
                        name: 'Nijie ID',
                        value: `[${data.nijie_id}](https://nijie.info/view.php?id=${data.nijie_id})`
                    }
                );
            }
            if (data.da_id) {
                info.addFields(
                    {
                        name: 'dA ID',
                        value: `[${data.da_id}](https://deviantart.com/view/${data.da_id})`
                    }
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
                info.addFields({ name: field, value: author.length ? author : 'Unknown' });
            }
            if (data.source && data.source.length) {
                info.addFields({ name: 'Source', value: data.source ?? 'Unknown' });
            }
            if ((data as any).material && (data as any).material.length) {
                info.addFields({ name: 'Material', value: (data as any).material ?? 'Unknown' });
            }
            if ((data as any).characters && (data as any).characters.length) {
                info.addFields({ name: 'Characters', value: (data as any).characters ?? 'Unknown' });
            }
            if ((data as any).est_time && (data as any).est_time.length) {
                info.addFields({ name: 'Est Time', value: (data as any).est_time ?? 'Unknown' });
            }
            if ((data as any).characters && (data as any).characters.length) {
                info.addFields([{ name: 'Characters', value: (data as any).characters ?? 'Unknown' }]);
            }
            if ((data as any).est_time && (data as any).est_time.length) {
                info.addFields([{ name: 'Est Time', value: (data as any).est_time ?? 'Unknown' }]);
            }
            display.addPage('thumbnail', { embed: info });
        }
        return await display.run(
            interaction,
            `> **SauceNAO Search Result • [** ${interaction.user.tag} **]**`
        );
    }
}
