import { MessageEmbed } from 'discord.js';
import type { Client } from './Client';
import { Paginator, PaginatorOptions } from './Paginator';
import { decode } from 'he';
import moment from 'moment';
import { Gallery, Comment, Language } from '@api/nhentai';
import { BANNED_TAGS, FLAG_EMOJIS } from '@constants';
import { Blacklist } from '@database/models';

export class Embeds {
    public client: Client;
    constructor(client: Client) {
        this.client = client;
    }

    default() {
        return new MessageEmbed().setColor('#000000');
    }

    success() {
        return new MessageEmbed().setColor('#008000');
    }

    info(text: string) {
        return new MessageEmbed().setColor('#f0f0f0').setDescription(text);
    }

    clientError(text: string) {
        return new MessageEmbed().setColor('#ff0000').setDescription(text);
    }

    internalError(text: string) {
        return new MessageEmbed()
            .setColor('#ff0000')
            .setDescription(
                `An unexpected error has occurred${
                    text.length < 2000 ? `:\n\`\`\`${text}\`\`\`` : '.'
                }`
            );
    }

    paginator(client: Client, options: PaginatorOptions) {
        return new Paginator(client, options);
    }

    private getPages(gallery: Gallery) {
        return this.client.nhentai.getPages(gallery).map(page => {
            const { id, title, upload_date } = gallery;
            return {
                galleryID: String(id),
                embed: this.default()
                    .setTitle(`${decode(title.english)}`)
                    .setURL(`https://nhentai.net/g/${id}`)
                    .setImage(page)
                    .setFooter(`ID : ${id}`)
                    .setTimestamp(upload_date * 1000),
            };
        });
    }

    displayGalleryInfo(
        gallery: Gallery,
        danger = false,
        blacklists: Blacklist[] = [],
        follows: number[] = []
    ) {
        const { tags, num_pages, upload_date } = gallery;
        const id = gallery.id.toString(),
            title = decode(gallery.title.english);
        const info = this.default()
            .setTitle(title)
            .setURL(`https://nhentai.net/g/${id}`)
            .setFooter(`ID : ${id}`)
            .setTimestamp(upload_date * 1000);
        const rip = this.client.util.hasCommon(
            tags.map(x => x.id.toString()),
            BANNED_TAGS
        );
        if (danger || !rip) info.setThumbnail(this.client.nhentai.getCoverThumbnail(gallery));
        const t = new Map();
        tags.sort((a, b) => b.count - a.count);
        tags.forEach(tag => {
            const { id, type, name, count } = tag;
            const a = t.get(type) || [];
            let s = `**\`${name}\`**\u2009\`(${
                count >= 1000 ? `${Math.floor(count / 1000)}K` : count
            })\``;
            // let s = `**\`${name}\`** \`(${count.toLocaleString()})\``;
            if (blacklists.some(bl => bl.id === id.toString())) s = `~~${s}~~`;
            if (follows.some(fl => fl === id)) s = `__${s}__`;
            a.push(s);
            t.set(type, a);
        });
        [
            ['parody', 'Parodies'],
            ['character', 'Characters'],
            ['tag', 'Tags'],
            ['artist', 'Artists'],
            ['group', 'Groups'],
            ['language', 'Languages'],
            ['category', 'Categories'],
        ].forEach(
            ([key, fieldName]) =>
                t.has(key) &&
                info.addField(fieldName, this.client.util.gshorten(t.get(key), '\u2009\u2009'))
        );
        // info.addField('‏‏‎ ‎', `${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
        //     .addField('Pages', `**\`[${doujin.num_pages}]\`**`);
        info.addField('Pages', `**\`${num_pages}\`**`).addField(
            'Uploaded',
            moment(upload_date * 1000).fromNow()
        );
        return { info, rip };
    }

    displayFullGallery(
        gallery: Gallery,
        page: number,
        danger = false,
        blacklists: Blacklist[] = []
    ) {
        const rip = this.client.util.hasCommon(
            gallery.tags.map(x => x.id.toString()),
            BANNED_TAGS
        );
        const id = gallery.id.toString(),
            title = decode(gallery.title.english);
        const displayGallery = this.paginator(this.client, {
            startPage: page,
            info: { id, name: title },
            collectorTimeout: 300000,
        }).addPage('info', {
            galleryID: id,
            embed: this.displayGalleryInfo(gallery, danger, blacklists).info,
        });
        if (danger || !rip) {
            displayGallery.addPage('thumbnail', this.getPages(gallery));
        }
        return { displayGallery, rip };
    }

    displayGalleryList(
        galleries: Gallery[],
        danger = false,
        blacklists: Blacklist[] = [],
        options?: {
            page?: number;
            num_pages?: number;
            num_results?: number;
            additional_options?: PaginatorOptions;
        }
    ) {
        let rip = false;
        const { page = 0, num_pages = 0, num_results = 0, additional_options = {} } = options || {};
        const displayList = this.paginator(this.client, {
            startView: 'thumbnail',
            collectorTimeout: 300000,
            ...additional_options,
        });
        for (const gallery of galleries) {
            const { id, title, tags, upload_date } = gallery;
            let language: Language = null;
            if (tags.some(tag => tag.id === 6346)) language = Language.Japanese;
            else if (tags.some(tag => tag.id === 12227)) language = Language.English;
            else if (tags.some(tag => tag.id === 29963)) language = Language.Chinese;
            const thumb = this.default()
                .setTitle(`${decode(title.english)}`)
                .setURL(`https://nhentai.net/g/${id}`)
                .setDescription(
                    `**ID** : ${id}` +
                        (FLAG_EMOJIS[language]
                            ? `\u2000•\u2000**Language** : ${FLAG_EMOJIS[language]}`
                            : '')
                )
                .setTimestamp(upload_date * 1000);
            const footer =
                (page ? `Page ${page} of ${num_pages || 1}` : '') +
                (num_results ? `${page ? '\u2000•\u2000' : ''}${num_results} galleries` : '');
            if (footer.length) thumb.setFooter(footer);
            const prip = this.client.util.hasCommon(
                tags.map(tag => tag.id.toString()),
                BANNED_TAGS
            );
            if (prip) rip = true;
            if (
                (danger || !prip) &&
                !blacklists.filter(b => tags.some(tag => tag.id.toString() === b.id)).length
            ) {
                thumb.setImage(this.client.nhentai.getCoverThumbnail(gallery));
            }
            const info = {
                galleryID: String(id),
                embed: this.displayGalleryInfo(gallery, danger, blacklists).info,
            };
            displayList.addPage(
                'info',
                danger || !prip ? { pages: this.getPages(gallery), ...info } : info
            );
            const thumbnail = {
                galleryID: String(id),
                embed: thumb,
            };
            displayList.addPage(
                'thumbnail',
                danger || !prip ? { pages: this.getPages(gallery), ...thumbnail } : thumbnail
            );
        }
        return { displayList, rip };
    }

    displayCommentList(comments: Comment[]) {
        const displayComments = this.paginator(this.client, {
            collectorTimeout: 180000,
        });
        for (const {
            id,
            gallery_id,
            poster: { id: uid, username, avatar_url },
            body,
            post_date,
        } of comments) {
            displayComments.addPage('thumbnail', {
                embed: this.default()
                    .setAuthor(
                        `${decode(username)}`,
                        `https://i5.nhentai.net/${avatar_url}`,
                        `https://nhentai.net/users/${uid}/${username}`
                    )
                    .setDescription(
                        `[${this.client.util.shorten(
                            body
                        )}](http://nhentai.net/g/${gallery_id}/#comment-${id})`
                    )
                    .setTimestamp(post_date * 1000),
            });
        }
        return displayComments;
    }
}
