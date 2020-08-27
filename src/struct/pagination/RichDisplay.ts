/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/RichDisplay.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import { Message, MessageEmbed as Embed } from 'discord.js';
import { Cache } from './Cache';
import { ReactionMethods, ReactionHandlerOptions, ReactionHandler } from './ReactionHandler';

type EmbedOrCallback = Embed | ((embed: Embed) => Embed);

interface Page { 
    embed: Embed,
    id?: string,
}

export interface RichDisplayOptions {
    template?: EmbedOrCallback;
    remove?: boolean;
    jump?: boolean;
    firstLast?: boolean;
    auto?: boolean;
    love?: boolean;
    image?: boolean;
}

export class RichDisplay {
    pages: Array<Page> = [];
    infoPage: Embed | null = null;
    gid: string | null = null;
    _emojis: Cache<ReactionMethods, string> = new Cache();
    protected _template: Embed;
    protected _footered = false;
    private footerPrefix = 'Page ';
    private footerSuffix = '';
    constructor(options: RichDisplayOptions = {}) {
        this._template = this.resolveEmbedOrCallback(options.template ?? new Embed());

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
            .set(ReactionMethods.Remove, '🗑');

        if (!(options.firstLast ?? true)) {
            this._emojis.delete(ReactionMethods.First);
            this._emojis.delete(ReactionMethods.Last);
        }
        if (!(options.jump ?? true)) this._emojis.delete(ReactionMethods.Jump);
        if (!(options.remove ?? true)) this._emojis.delete(ReactionMethods.Remove);
        if (!(options.auto ?? true)) {
            this._emojis.delete(ReactionMethods.Auto);
            this._emojis.delete(ReactionMethods.Pause);
        }
        if (!(options.love ?? true)) this._emojis.delete(ReactionMethods.Love);
        if (options.image ?? false) {
            this._emojis.clear();
            this._emojis.set(ReactionMethods.Remove, '🗑');
        }
    }

    async run(message: Message, options: ReactionHandlerOptions = {}): Promise<ReactionHandler> {
        if (!this.infoPage) this._emojis.delete(ReactionMethods.Info);
        if (!this._footered) this.footer();

        let msg: Message;
        if (message.editable) {
            await message.edit('', {
                embed: this.pages[options.startPage || 0].embed,
            });
            msg = message;
        } else {
            msg = await message.channel.send('', {
                embed: this.pages[options.startPage || 0].embed,
            });
        }

        return new ReactionHandler(msg, options, this, this._emojis);
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

    setGID(id: string): this {
        this.gid = id;
		return this;
    }

    useCustomFooters(): this {
        this._footered = true;
        return this;
    }

    addPage(embed: EmbedOrCallback, id?: string): this {
        this.pages.push({ 
            embed: this.resolveEmbedOrCallback(embed),
            id: id
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
        if (this.infoPage) this.infoPage.setFooter('ℹ');
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
