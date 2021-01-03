import { MessageEmbed } from 'discord.js';
import { RichDisplay, RichDisplayOptions, RichMenu } from '@utils/pagination';
import type { Client } from './Client';
import he from 'he';
import moment from 'moment';
import { Gallery, Comment, Language } from '@api/nhentai';
import { ICON, BANNED_TAGS, FLAG_EMOJIS } from '@utils/constants';
import { Blacklist } from '@models/tag';

export class Embeds {
    public client: Client;
    constructor(client: Client) {
        this.client = client;
    }
    richDisplay(options?: RichDisplayOptions) {
        return new RichDisplay(options);
    }

    richMenu(options?: RichDisplayOptions) {
        return new RichMenu(options);
    }

    success() {
        return new MessageEmbed().setColor('#ff66ab');
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

    displayGalleryInfo(gallery: Gallery, danger = false, blacklists: Blacklist[] = []) {
        const { tags, num_pages, upload_date } = gallery;
        const id = gallery.id.toString(),
            title = he.decode(gallery.title.english);
        const info = this.client.util
            .embed()
            .setAuthor(title, ICON, `https://nhentai.net/g/${id}`)
            .setFooter(`ID : ${id}`)
            .setTimestamp();
        const rip = this.client.util.hasCommon(
            tags.map(x => x.id.toString()),
            BANNED_TAGS
        );
        if (danger || !rip) info.setThumbnail(this.client.nhentai.getCoverThumbnail(gallery));
        const t = new Map();
        tags.forEach(tag => {
            const { id, type, name, count } = tag;
            const a = t.get(type) || [];
            let s = `**\`${name}\`**\`(${count.toLocaleString()})\``;
            if (blacklists.some(bl => bl.id === id.toString())) s = `~~${s}~~`;
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
                t.has(key) && info.addField(fieldName, this.client.util.gshorten(t.get(key)))
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
        danger = false,
        auto = false,
        blacklists: Blacklist[] = []
    ) {
        const rip = this.client.util.hasCommon(
            gallery.tags.map(x => x.id.toString()),
            BANNED_TAGS
        );
        if (danger || !rip) {
            const id = gallery.id.toString(),
                title = he.decode(gallery.title.english);
            const displayGallery = this.richDisplay({ auto, download: true })
                .setInfo({ id, type: 'g', name: title })
                .setInfoPage(
                    this.displayGalleryInfo(gallery, danger, blacklists).info.setFooter(
                        `ID : ${id}${auto ? '• React with 🇦 to start an auto session' : ''}`
                    )
                );
            this.client.nhentai
                .getPages(gallery)
                .forEach((page: string) =>
                    displayGallery.addPage(this.client.util.embed().setImage(page).setTimestamp())
                );
            return { displayGallery, rip };
        } else {
            return {
                displayGallery: this.richDisplay({ image: true })
                    .addPage(this.displayGalleryInfo(gallery, danger, blacklists).info)
                    .useCustomFooters(),
                rip,
            };
        }
    }

    displayGalleryList(
        galleries: Gallery[],
        danger = false,
        blacklists: Blacklist[] = [],
        options?: {
            page?: number;
            num_pages?: number;
            num_results?: number;
            additional_options?: RichDisplayOptions;
        }
    ) {
        let rip = false;
        const { page = 0, num_pages = 0, num_results = 0, additional_options = {} } = options || {};
        const displayList = this.richDisplay({
            info: true,
            download: true,
            removeRequest: false,
            ...additional_options,
        }).useCustomFooters();
        for (const [idx, gallery] of galleries.entries()) {
            const { id, title, tags } = gallery;
            let language: Language = null;
            if (tags.some(tag => tag.id === 6346)) language = Language.Japanese;
            else if (tags.some(tag => tag.id === 12227)) language = Language.English;
            else if (tags.some(tag => tag.id === 29963)) language = Language.Chinese;
            const thumb = this.client.util
                .embed()
                .setTitle(`${he.decode(title.english)}`)
                .setURL(`https://nhentai.net/g/${id}`)
                .setDescription(
                    `**ID** : ${id}` +
                        (FLAG_EMOJIS[language]
                            ? `\u2000•\u2000**Language** : ${FLAG_EMOJIS[language]}`
                            : '')
                )
                .setFooter(
                    `Gallery ${idx + 1} of ${galleries.length}` +
                        (page ? `\u2000•\u2000Page ${page} of ${num_pages || 1}` : '') +
                        (num_results ? `\u2000•\u2000${num_results} galleries` : '')
                )
                .setTimestamp();
            const bTags = blacklists.filter(b => tags.some(tag => tag.id.toString() === b.id)),
                len = bTags.length;
            if (len) {
                thumb.description +=
                    '\n\nThis gallery contains ' +
                    (len === 1 ? 'a blacklisted tag' : 'several blacklisted tags') +
                    '. Therefore, thumbnail image will be hidden.';
                let t = new Map<string, string[]>();
                bTags.forEach(tag => {
                    const { type, name } = tag;
                    let a = t.get(type) || [];
                    a.push(`\`${name}\``);
                    t.set(type, a);
                });
                let s = '';
                [
                    ['parody', 'Parodies'],
                    ['character', 'Characters'],
                    ['tag', 'Tags'],
                    ['artist', 'Artists'],
                    ['group', 'Groups'],
                    ['language', 'Languages'],
                    ['category', 'Categories'],
                ].forEach(([key, fieldName]) => {
                    if (t.has(key)) s += `• **${fieldName}** : ${t.get(key).join(', ')}\n`;
                });
                thumb.addField('Blacklist', this.client.util.shorten(s, '\n', 1024));
            }
            const prip = this.client.util.hasCommon(
                tags.map(tag => tag.id.toString()),
                BANNED_TAGS
            );
            if (prip) rip = true;
            if ((danger || !prip) && !len)
                thumb.setImage(this.client.nhentai.getCoverThumbnail(gallery));
            displayList.addPage(thumb, gallery);
        }
        return { displayList, rip };
    }

    displayCommentList(comments: Comment[]) {
        const displayComments = this.richDisplay({
            love: false,
            removeRequest: false,
        }).useCustomFooters();
        for (const [
            idx,
            {
                poster: { username, avatar_url },
                body,
                post_date,
            },
        ] of comments.entries()) {
            displayComments.addPage(
                this.client.util
                    .embed()
                    .setAuthor(`${he.decode(username)}`, `https://i5.nhentai.net/${avatar_url}`)
                    .setDescription(body)
                    .setFooter(
                        `Comment ${idx + 1} of ${comments.length}\u2000•\u2000Posted ${moment(
                            post_date * 1000
                        ).fromNow()}`
                    )
            );
        }
        return displayComments;
    }
}
