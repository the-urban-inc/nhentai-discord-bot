/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/RichDisplay.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import { Message, MessageEmbed as Embed } from 'discord.js';
import { Cache } from './Cache';
import { ReactionMethods, ReactionHandlerOptions, ReactionHandler } from './ReactionHandler';
import { Client } from '@structures';
import { Blacklist } from '@models/tag';
import { Gallery } from '@api/nhentai';

type EmbedOrCallback = Embed | ((embed: Embed) => Embed);

interface Page {
    embed: Embed;
    gallery?: Gallery;
}

export interface RichDisplayOptions {
    template?: EmbedOrCallback;
    remove?: boolean;
    removeOnly?: boolean;
    removeRequest?: boolean;
    jump?: boolean;
    firstLast?: boolean;
    info?: boolean;
    auto?: boolean;
    love?: boolean;
    follow?: boolean;
    blacklist?: boolean;
    download?: boolean;
    image?: string;
    list?: number;
}

export class RichDisplay {
    pages: Array<Page> = [];
    options: RichDisplayOptions;
    infoPage: Embed | null = null;
    info: Blacklist | null = null;
    caller: string | null = null;
    _emojis: Cache<ReactionMethods, string> = new Cache();
    protected _template: Embed;
    protected _footered = false;
    private footerPrefix = 'Page ';
    private footerSuffix = '';
    constructor(options: RichDisplayOptions = {}) {
        this._template = this.resolveEmbedOrCallback(options.template ?? new Embed());
        this.options = options;

        this._emojis
            .set(ReactionMethods.First, '⏮')
            .set(ReactionMethods.Back, '◀')
            .set(ReactionMethods.Jump, '↗️')
            .set(ReactionMethods.Forward, '▶')
            .set(ReactionMethods.Last, '⏭')
            .set(ReactionMethods.Info, 'ℹ')
            .set(ReactionMethods.Auto, '🇦')
            .set(ReactionMethods.Pause, '⏹')
            .set(ReactionMethods.Love, '❤️')
            .set(ReactionMethods.Follow, '🔖')
            .set(ReactionMethods.Blacklist, '🏴')
            .set(ReactionMethods.Download, '📥')
            .set(ReactionMethods.Remove, '🗑');

        if (!(options.firstLast ?? true)) {
            this._emojis.delete(ReactionMethods.First);
            this._emojis.delete(ReactionMethods.Last);
        }
        if (!(options.jump ?? true)) this._emojis.delete(ReactionMethods.Jump);
        if (!(options.auto ?? false)) {
            this._emojis.delete(ReactionMethods.Auto);
            this._emojis.delete(ReactionMethods.Pause);
        }
        if (!(options.love ?? true)) this._emojis.delete(ReactionMethods.Love);
        if (!(options.follow ?? false)) this._emojis.delete(ReactionMethods.Follow);
        if (!(options.blacklist ?? false)) this._emojis.delete(ReactionMethods.Blacklist);
        if (!(options.download ?? false)) this._emojis.delete(ReactionMethods.Download);
        if (!(options.remove ?? true)) this._emojis.delete(ReactionMethods.Remove);
        if (options.removeOnly ?? false) {
            this._emojis.clear();
            this._emojis.set(ReactionMethods.Remove, '🗑');
        }
        if (!!options.image ?? false) {
            this._emojis.clear();
            this._emojis.set(ReactionMethods.Info, 'ℹ').set(ReactionMethods.Remove, '🗑');
        }
    }

    async run(
        client: Client,
        requestMessage: Message,
        message: Message,
        editMessage: string = '',
        options: ReactionHandlerOptions = {}
    ): Promise<ReactionHandler> {
        if (!(this.options.info ?? this.infoPage) && !this.options.image) this._emojis.delete(ReactionMethods.Info);
        if (!this._footered) this.footer();
        if (this.pages.length <= 1) {
            this._emojis.delete(ReactionMethods.First);
            this._emojis.delete(ReactionMethods.Last);
            this._emojis.delete(ReactionMethods.Forward);
            this._emojis.delete(ReactionMethods.Back);
            this._emojis.delete(ReactionMethods.Jump);
        }
        if (this.options.removeRequest !== false) this.options.removeRequest = true;
        if (!!this.options.image) options.imageURL = this.options.image;
        let msg: Message;
        if (message.editable) {
            await message.edit(
                editMessage,
                !isNaN(options.startPage) && options.startPage > 0
                    ? this.pages[options.startPage].embed
                    : this.infoPage ?? this.pages[0].embed
            );
            msg = message;
        } else {
            msg = await message.channel.send(
                editMessage,
                !isNaN(options.startPage) && options.startPage > 0
                    ? this.pages[options.startPage].embed
                    : this.infoPage ?? this.pages[0].embed
            );
        }
        return new ReactionHandler(client, requestMessage, msg, options, this, this._emojis);
    }

    setEmojis(emojis: Record<ReactionMethods, string>): this {
        for (const [key, value] of Object.entries(emojis)) {
            if (this._emojis.has(key as ReactionMethods))
                this._emojis.set(key as ReactionMethods, value);
        }
        return this;
    }

    setFooterPrefix(prefix: string): this {
        this._footered = false;
        this.footerPrefix = prefix;
        return this;
    }

    setFooterSuffix(suffix: string): this {
        this._footered = false;
        this.footerSuffix = suffix;
        return this;
    }

    setInfo(info: Blacklist): this {
        this.info = info;
        return this;
    }

    setCaller(caller: string): this {
        this.caller = caller;
        return this;
    }

    useCustomFooters(): this {
        this._footered = true;
        return this;
    }

    addPage(embed: EmbedOrCallback, gallery?: Gallery): this {
        this.pages.push({
            embed: this.resolveEmbedOrCallback(embed),
            gallery,
        });
        return this;
    }

    setInfoPage(embed: EmbedOrCallback): this {
        this.infoPage = this.resolveEmbedOrCallback(embed);
        return this;
    }

    protected get template(): Embed {
        return new Embed(this._template);
    }

    private footer(): void {
        for (let i = 1; i <= this.pages.length; i++)
            this.pages[i - 1].embed.setFooter(
                `${this.footerPrefix}${i} of ${this.pages.length}${this.footerSuffix}`
            );
    }

    private resolveEmbedOrCallback(embed: EmbedOrCallback): Embed {
        if (typeof embed === 'function') {
            const page = embed(this.template);
            if (page instanceof Embed) return page;
        } else if (embed instanceof Embed) {
            return embed;
        }
        throw new TypeError('Expected a Embed or Function returning a Embed');
    }
}
