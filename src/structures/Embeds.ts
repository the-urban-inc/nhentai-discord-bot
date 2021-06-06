import { Message, MessageEmbed } from 'discord.js';
import { RichDisplay, RichDisplayOptions, RichMenu } from '@utils/pagination';
import type { Client } from './Client';
import type { Command, ErrorType } from './Command';
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

    default() {
        return new MessageEmbed().setColor('#000000');
    }

    richDisplay(options?: RichDisplayOptions) {
        return new RichDisplay(options);
    }

    richMenu(options?: RichDisplayOptions) {
        return new RichMenu(options);
    }

    success() {
        return new MessageEmbed().setColor('#008000');
    }

    info(text: string) {
        return new MessageEmbed().setColor('#f0f0f0').setDescription(text);
    }

    commandError(err: Error, message: Message, command: Command) {
        let { id, areMultipleCommands, nsfw, subAliases, error: e } = command;
        let alias = message.util?.parsed?.alias;
        if (alias.startsWith('nsfw_')) alias = alias.slice(5);
        const prefix =
            nsfw || !('nsfw' in command)
                ? this.client.config.settings.prefix.nsfw[0]
                : this.client.config.settings.prefix.sfw[0];
        let error = e[err.message as ErrorType];
        if (areMultipleCommands) {
            id = Object.keys(subAliases).find(
                key => key === alias || subAliases[key].aliases?.includes(alias)
            );
            error = subAliases[id]?.error?.[err.message as ErrorType] ?? error;
        }
        if (!error) return;
        const [example = '', description = ''] = error.example.replace('\n', '\x01').split('\x01');
        return new MessageEmbed()
            .setColor('#ff0000')
            .setTitle(`\`❌\`\u2009\u2009${error.message}`)
            .setDescription(
                ['No Voice Channel', 'No Result', 'Parsing Failed'].includes(err.message)
                    ? example
                    : `Example: \`${prefix}${id}${example}\` ${description}\nType \`${prefix}help ${id}\` for more info.`
            )
            .setFooter(message.author.tag, message.author.displayAvatarURL());
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
        const info = this.default()
            .setAuthor(title, ICON, `https://nhentai.net/g/${id}`)
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
        danger = false,
        auto = false,
        blacklists: Blacklist[] = [],
        caller?: string
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
                        `ID : ${id}${
                            auto ? '\u2000•\u2000React with 🇦 to start an auto session' : ''
                        }`
                    )
                );
            if (caller) displayGallery.setCaller(caller);
            this.client.nhentai.getPages(gallery).forEach((page, i) =>
                displayGallery.addPage(
                    this.default()
                        .setImage(page)
                        .setFooter(`ID : ${id}\u2000•\u2000Page ${i + 1} of ${gallery.num_pages}`)
                        .setTimestamp()
                )
            );
            return { displayGallery, rip };
        } else {
            return {
                displayGallery: this.richDisplay({ removeOnly: true })
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
            caller?: string;
            additional_options?: RichDisplayOptions;
        }
    ) {
        let rip = false;
        const {
            page = 0,
            num_pages = 0,
            num_results = 0,
            caller = '',
            additional_options = {},
        } = options || {};
        const displayList = this.richDisplay({
            info: true,
            download: true,
            removeRequest: false,
            ...additional_options,
        }).useCustomFooters();
        if (caller.length) displayList.setCaller(caller);
        for (const [idx, gallery] of galleries.entries()) {
            const { id, title, tags, upload_date } = gallery;
            let language: Language = null;
            if (tags.some(tag => tag.id === 6346)) language = Language.Japanese;
            else if (tags.some(tag => tag.id === 12227)) language = Language.English;
            else if (tags.some(tag => tag.id === 29963)) language = Language.Chinese;
            const thumb = this.default()
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
                .setTimestamp(upload_date * 1000);
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
                id,
                gallery_id,
                poster: { id: uid, username, avatar_url },
                body,
                post_date,
            },
        ] of comments.entries()) {
            displayComments.addPage(
                this.default()
                    .setAuthor(
                        `${he.decode(username)}`,
                        `https://i5.nhentai.net/${avatar_url}`,
                        `https://nhentai.net/users/${uid}/${username}`
                    )
                    .setDescription(
                        `[${this.client.util.shorten(
                            body
                        )}](http://nhentai.net/g/${gallery_id}/#comment-${id})`
                    )
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
