import { Embed, EmbedBuilder } from 'discord.js';
import type { Client } from './Client';
import { Paginator, PaginatorOptions } from './Paginator';
import { decode } from 'he';
import { Gallery, Comment, Language, PartialGallery } from '@api/nhentai';
import { SearchResult } from '@api/jasmr';
import { BANNED_TAGS, FLAG_EMOJIS } from '@constants';
import { Blacklist, Language as LanguageModel } from '@database/models';

export class Embeds {
    public client: Client;
    constructor(client: Client) {
        this.client = client;
    }

    default() {
        return new EmbedBuilder().setColor('#000000');
    }

    success() {
        return new EmbedBuilder().setColor('#008000');
    }

    info(text: string) {
        return new EmbedBuilder().setColor('#f0f0f0').setDescription(text);
    }

    clientError(text: string) {
        return new EmbedBuilder().setColor('#ff0000').setDescription(text);
    }

    shorten(text: string, length = 2048, split = ' ') {
        if (text.length <= length) return text;
        return text.substring(0, text.lastIndexOf(split, length) + 1) + '...';
    }

    internalError(text: string) {
        return new EmbedBuilder()
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

    getPages(gallery: Gallery) {
        return this.client.nhentai.getPages(gallery).map(page => {
            const { id, title, upload_date } = gallery;
            return {
                galleryID: String(id),
                embed: this.default()
                    .setTitle(`${this.shorten(decode(title.english), 250)}`)
                    .setURL(`https://nhentai.net/g/${id}`)
                    .setImage(page)
                    .setFooter({ text: `ID : ${id}` })
                    .setTimestamp(upload_date * 1000),
            };
        });
    }

    getEduGuessPages(gallery: PartialGallery) {
        return this.client.nhentai.eduGuessPages(gallery).map(page => {
            const { id, title, upload_date } = gallery;
            return {
                galleryID: String(id),
                embed: this.default()
                    .setTitle(`${this.shorten(decode(title.english), 250)}`)
                    .setURL(`https://nhentai.net/g/${id}`)
                    .setImage(page)
                    .setFooter({ text: `ID : ${id}` })
                    .setTimestamp(upload_date * 1000),
            };
        });
    }

    displayGalleryInfo(
        gallery: PartialGallery | Gallery,
        danger = false,
        blacklists: Blacklist[] = [],
        follows: number[] = []
    ) {
        const { tags, num_pages, upload_date } = gallery;
        const id = gallery.id.toString(),
            title = this.shorten(decode(gallery.title.english), 250);
        const info = this.default()
            .setTitle(title)
            .setURL(`https://nhentai.net/g/${id}`)
            .setFooter({ text: `ID : ${id}` })
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
                count ? (count >= 1000 ? `${Math.floor(count / 1000)}K` : count) : '?'
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
                info.addFields([
                    {
                        name: fieldName,
                        value: this.client.util.gshorten(t.get(key), '\u2009\u2009'),
                    },
                ])
        );
        // info.addField('‏‏‎ ‎', `${doujin.num_pages} pages\nUploaded ${moment(doujin.upload_date * 1000).fromNow()}`);
        //     .addField('Pages', `**\`[${doujin.num_pages}]\`**`);
        info.addFields([
            {
                name: 'Pages',
                value: `**\`${num_pages}\`**`,
            },
            {
                name: 'Uploaded',
                value: `<t:${gallery.upload_date}:R>`,
            },
        ]);
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
            title = this.shorten(decode(gallery.title.english), 250);
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

    displayLazyFullGallery(gallery: PartialGallery, danger = false, blacklists: Blacklist[] = []) {
        const rip = this.client.util.hasCommon(
            gallery.tags.map(x => x.id.toString()),
            BANNED_TAGS
        );
        const id = gallery.id.toString(),
            title = this.shorten(decode(gallery.title.english), 250);
        const displayGallery = this.paginator(this.client, {
            info: { id, name: title },
            collectorTimeout: 300000,
        }).addPage('info', {
            galleryID: id,
            embed: this.displayGalleryInfo(gallery, danger, blacklists).info,
        });
        if (danger || !rip) {
            displayGallery.addPage('thumbnail', [{ galleryID: -id, embed: this.default() }]);
        }
        return { displayGallery, rip };
    }

    displayShortGallery(
        gallery: PartialGallery | Gallery,
        danger = false,
        blacklists: Blacklist[] = [],
        follows: number[] = []
    ) {
        const { id, title, tags, upload_date } = gallery;
        const rip = this.client.util.hasCommon(
            tags.map(x => x.id.toString()),
            BANNED_TAGS
        );
        tags.sort((a, b) => b.count - a.count);
        tags.forEach(tag => {
            const { id, name } = tag;
            let s = name;
            // let s = `**\`${name}\`** \`(${count.toLocaleString()})\``;
            if (blacklists.some(bl => bl.id === id.toString())) s = `~~${s}~~`;
            if (follows.some(fl => fl === id)) s = `__${s}__`;
            tag.name = s;
        });
        const thumb = this.default()
            .setTitle(`${decode(title.pretty)}`)
            .setURL(`https://nhentai.net/g/${id}`)
            .setDescription(
                this.client.util.gshorten(
                    tags.filter(tag => tag.type == 'tag').map(tag => tag.name),
                    ', ',
                    4096
                )
            )
            .setFooter({ text: `ID : ${id}` })
            .setTimestamp(upload_date * 1000);
        if (danger || !rip) thumb.setThumbnail(this.client.nhentai.getCoverThumbnail(gallery));
        return { thumb, rip };
    }

    displayGalleryList(
        galleries: Gallery[],
        danger = false,
        blacklists: Blacklist[] = [],
        language: LanguageModel = { preferred: [], query: false, follow: false },
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
            filterIDs: language.query
                ? galleries
                      .filter(
                          g =>
                              !g.tags.some(tag =>
                                  language.preferred.map(x => x.id).includes(String(tag.id))
                              )
                      )
                      .map(g => +g.id)
                : [],
        });
        for (const gallery of galleries) {
            const { id, title, tags, upload_date } = gallery;
            let language: Language = null;
            if (tags.some(tag => tag.id === 6346)) language = Language.Japanese;
            else if (tags.some(tag => tag.id === 12227)) language = Language.English;
            else if (tags.some(tag => tag.id === 29963)) language = Language.Chinese;
            const thumb = this.default()
                .setTitle(`${this.shorten(decode(title.english), 250)}`)
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
            if (footer.length) thumb.setFooter({ text: footer });
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

    displayLazyGalleryList(
        galleries: PartialGallery[],
        danger = false,
        blacklists: Blacklist[] = [],
        language: LanguageModel = { preferred: [], query: false, follow: false },
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
            filterIDs: language.query
                ? galleries
                      .filter(
                          g =>
                              !g.tags.some(tag =>
                                  language.preferred.map(x => x.id).includes(String(tag.id))
                              )
                      )
                      .map(g => +g.id)
                : [],
        });
        for (const gallery of galleries) {
            const { id, title, tags, upload_date } = gallery;
            let language: Language = null;
            if (tags.some(tag => tag.id === 6346)) language = Language.Japanese;
            else if (tags.some(tag => tag.id === 12227)) language = Language.English;
            else if (tags.some(tag => tag.id === 29963)) language = Language.Chinese;
            const thumb = this.default()
                .setTitle(`${this.shorten(decode(title.english), 250)}`)
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
            if (footer.length) thumb.setFooter({ text: footer });
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
                danger || !prip
                    ? { pages: [{ galleryID: -id, embed: this.default() }], ...info }
                    : info
            );
            const thumbnail = {
                galleryID: String(id),
                embed: thumb,
            };
            displayList.addPage(
                'thumbnail',
                danger || !prip
                    ? { pages: [{ galleryID: -id, embed: this.default() }], ...thumbnail }
                    : thumbnail
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
                    .setAuthor({
                        name: `${decode(username)}`,
                        iconURL: `https://i5.nhentai.net/${avatar_url}`,
                        url: `https://nhentai.net/users/${uid}/${username}`,
                    })
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

    displayASMRList(asmr: SearchResult[]) {
        const displayASMR = this.paginator(this.client, {
            collectorTimeout: 180000,
        });
        for (const {
            language,
            rating,
            circle,
            title,
            url,
            tags,
            image,
            duration,
            views,
            likes,
        } of asmr) {
            displayASMR.addPage('thumbnail', {
                embed: this.default()
                    .setTitle(title)
                    .setURL(url)
                    .addFields([
                        {
                            name: 'Metadata',
                            value:
                            `• **Language** : ${language}\n` + `• **Rating** : ${rating}\n` +
                                `• **Duration** : ${duration}\n` +
                                `• **Views** : ${views}\n` +
                                `• **Likes** : ${likes}`,
                        },
                        {
                            name: 'Tags',
                            value: tags.length ? tags.map(t => `\`${t.trim()}\``).join(' ') : 'N/A',
                        },
                    ])
                    .setThumbnail(image)
                    .setFooter({ text: `Circle: ${circle}` }),
            });
        }
        return displayASMR;
    }
}
