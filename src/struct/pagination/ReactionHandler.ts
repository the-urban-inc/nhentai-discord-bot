/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/ReactionHandler.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import {
    Message,
    ReactionCollector,
    ReactionCollectorOptions,
    User as DiscordUser,
} from 'discord.js';
import he from 'he';
import moment from 'moment';
import { Cache } from './Cache';
import { RichDisplay } from './RichDisplay';
import { RichMenu } from './RichMenu';
import { Gallery } from '@nhentai/struct/nhentai/src/struct';
import { Tag } from '@nhentai/struct/nhentai/src/struct';
import { ICON } from '@nhentai/utils/constants';
import { NhentaiClient } from '@nhentai/struct/bot/Client';

export interface ReactionHandlerOptions extends ReactionCollectorOptions {
    stop?: boolean;
    prompt?: string;
    promptAuto?: string;
    stopAuto?: string;
    endAuto?: string;
    noAuto?: string;
    startPage?: number;
    max?: number;
    maxEmojis?: number;
    maxUsers?: number;
    jumpTimeout?: number;
    autoTimeout?: number;
}

export const enum ReactionMethods {
    First = 'first',
    Back = 'back',
    Forward = 'forward',
    Last = 'last',
    Jump = 'jump',
    Info = 'info',
    Auto = 'auto',
    Pause = 'pause',
    Love = 'love',
    Blacklist = 'blacklist',
    Remove = 'remove',
    One = 'one',
    Two = 'two',
    Three = 'three',
    Four = 'four',
    Five = 'five',
}

export class ReactionHandler {
    readonly selection: Promise<number | null>;
    readonly client: NhentaiClient;
    readonly requestMessage: Message;
    readonly message: Message;
    private readonly display: RichDisplay | RichMenu;
    private readonly methodMap: Map<string, ReactionMethods>;
    private readonly prompt: string;
    private readonly promptAuto: string;
    private readonly stopAuto: string;
    private readonly endAuto: string;
    private readonly noAuto: string;
    private readonly jumpTimeout: number;
    private readonly autoTimeout: number;
    readonly collector: ReactionCollector;
    #ended = false;
    #awaiting = false;
    #info = false;
    #autoMode: NodeJS.Timeout;
    #currentPage: number;
    #resolve:
        | ((value?: number | PromiseLike<number | null> | null | undefined) => void)
        | null = null;

    constructor(
        client: NhentaiClient,
        requestMessage: Message,
        message: Message,
        options: ReactionHandlerOptions,
        display: RichDisplay | RichMenu,
        emojis: Cache<ReactionMethods, string>
    ) {
        if (!message.guild)
            throw new Error(
                'RichDisplays and subclasses cannot be used in DMs, as they do not have enough permissions to perform in a UX friendly way.'
            );
        this.client = client;
        this.message = message;
        this.requestMessage = requestMessage;
        this.display = display;
        this.methodMap = new Map(emojis.map((value, key) => [value, key]));
        this.prompt = options.prompt ?? 'Which page would you like to jump to?';
        this.promptAuto =
            options.promptAuto ??
            'Starting auto session.\nHow many seconds would you prefer me waiting in between pages?';
        this.stopAuto = options.stopAuto ?? 'Stopped current auto session.';
        this.endAuto = options.endAuto ?? 'Reached last page. Stopping auto session.';
        this.noAuto = options.noAuto ?? "There's no existing auto session. Nothing happened.";
        this.jumpTimeout = options.jumpTimeout ?? 30000;
        this.autoTimeout = options.autoTimeout ?? 30000;
        this.selection = emojis.has(ReactionMethods.One)
            ? new Promise(resolve => {
                  this.#resolve = resolve;
              })
            : Promise.resolve(null);
        this.#currentPage = options.startPage ?? (this.display.infoPage ? -1 : 0);
        this.run([...emojis.values()]);
        this.collector = this.message.createReactionCollector(() => true, options);
        this.collector.on('collect', async (reaction, user) => {
            if (user.bot) return;
            const method = this.methodMap.get((reaction.emoji.name ?? reaction.emoji.id) as string);
            if (!method) return;
            const signals = await Promise.all([
                reaction.users.remove(user),
                this.methods.get(method)?.call(this, user),
            ]);
            if (signals[1]) this.collector.stop();
        });
        this.collector.on('end', async () => {
            if (
                this.message &&
                !this.message.deleted &&
                this.message.client.guilds.cache.has(this.message.guild!.id)
            ) {
                try {
                    await this.message.reactions.removeAll();
                } catch (error) {
                    // Harmless error. Unable to fix for now
                    if (error.code === 10008) return;
                    this.message.client.emit('error', error);
                }
            }
        });
    }

    public stop(): boolean {
        this.#ended = true;
        if (this.#resolve) this.#resolve(null);
        return true;
    }

    private choose(value: number): Promise<boolean> {
        if ((this.display as RichMenu).choices.length - 1 < value) return Promise.resolve(false);
        this.#resolve!(value);
        this.#ended = true;
        return Promise.resolve(true);
    }

    private async run(emojis: Array<string>): Promise<void> {
        await this.setup(emojis);
    }

    private async update(): Promise<boolean> {
        if (this.message.deleted) return true;
        this.#info = false;
        await this.message.edit('', {
            embed: this.display.pages[this.#currentPage].embed,
        });
        return false;
    }

    private async setup(emojis: Array<string>): Promise<boolean> {
        if (this.message.deleted) return this.stop();
        if (this.#ended) return true;
        try {
            this.message.react(emojis.shift() as string);
        } catch {
            return this.stop();
        }
        if (emojis.length) return this.setup(emojis);
        return false;
    }

    private methods: Map<
        ReactionMethods,
        (this: ReactionHandler, user: DiscordUser) => Promise<boolean>
    > = new Map()
        .set(ReactionMethods.First, function (this: ReactionHandler): Promise<boolean> {
            this.#currentPage = 0;
            return this.update();
        })
        .set(ReactionMethods.Back, function (this: ReactionHandler): Promise<boolean> {
            if (this.#currentPage <= 0) return Promise.resolve(false);
            this.#currentPage--;
            return this.update();
        })
        .set(ReactionMethods.Forward, function (this: ReactionHandler): Promise<boolean> {
            if (this.#currentPage >= this.display.pages.length - 1) return Promise.resolve(false);
            this.#currentPage++;
            return this.update();
        })
        .set(ReactionMethods.Last, function (this: ReactionHandler): Promise<boolean> {
            this.#currentPage = this.display.pages.length - 1;
            return this.update();
        })
        .set(ReactionMethods.Jump, async function (
            this: ReactionHandler,
            user: DiscordUser
        ): Promise<boolean> {
            if (this.#awaiting) return Promise.resolve(false);
            this.#awaiting = true;
            const message = await this.message.channel.send(this.client.embeds.info(this.prompt));
            const collected = await this.message.channel.awaitMessages(
                mess => mess.author === user,
                {
                    max: 1,
                    idle: this.jumpTimeout,
                }
            );
            this.#awaiting = false;
            await message.delete();
            const response = collected.first();
            if (!response) return Promise.resolve(false);
            const newPage = parseInt(response.content);
            await response.delete();
            if (newPage && newPage > 0 && newPage <= this.display.pages.length) {
                this.#currentPage = newPage - 1;
                return this.update();
            }
            return Promise.resolve(false);
        })
        .set(ReactionMethods.Info, async function (this: ReactionHandler): Promise<boolean> {
            if (this.message.deleted) return true;
            if (this.#info) return this.update();
            if (!this.display.infoPage) {
                const pid = this.display.pages[this.#currentPage].id;
                if (!pid) return false;
                const doujin: Gallery = await this.client.nhentai.g(
                    pid,
                    false
                );
                const { title, id, tags, num_pages, upload_date } = doujin.details;
                const info = this.client.util
                    .embed()
                    .setAuthor(he.decode(title.english), ICON, `https://nhentai.net/g/${id}`)
                    .setThumbnail(doujin.getCoverThumbnail())
                    .setTimestamp();
                let t = new Map();
                tags.forEach((tag: Tag) => {
                    let a = t.get(tag.type) || [];
                    a.push(`**\`${tag.name}\`**\`(${tag.count.toLocaleString()})\``);
                    t.set(tag.type, a);
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
                        info.addField(fieldName, this.client.util.gshorten(t.get(key)))
                );
                info.addField('Pages', `**\`${num_pages}\`**`).addField(
                    'Uploaded',
                    moment(upload_date * 1000).fromNow()
                );
                this.display.infoPage = info;
            }
            await this.message.edit('', { embed: this.display.infoPage });
            this.#info = true; this.display.infoPage = null;
            return false;
        })
        .set(ReactionMethods.Auto, async function (
            this: ReactionHandler,
            user: DiscordUser
        ): Promise<boolean> {
            if (this.#awaiting) return Promise.resolve(false);
            this.#awaiting = true;
            const message = await this.message.channel.send(
                this.client.embeds.info(this.promptAuto)
            );
            const collected = await this.message.channel.awaitMessages(
                mess => mess.author === user,
                { max: 1, idle: this.autoTimeout }
            );
            this.#awaiting = false;
            await message.delete();
            const response = collected.first();
            if (!response) return Promise.resolve(false);
            const seconds = parseInt(response.content);
            await response.delete();
            this.update();
            this.#autoMode = setInterval(() => {
                if (this.#currentPage >= this.display.pages.length - 1) {
                    clearInterval(this.#autoMode);
                    return this.message.channel
                        .send(this.client.embeds.info(this.endAuto))
                        .then(message => message.delete({ timeout: 5000 }));
                }
                this.#currentPage++;
                this.update();
            }, seconds * 1000);
            return Promise.resolve(false);
        })
        .set(ReactionMethods.Pause, function (this: ReactionHandler): Promise<boolean> {
            if (this.#autoMode) {
                clearInterval(this.#autoMode);
                this.message.channel
                    .send(this.client.embeds.info(this.stopAuto))
                    .then(message => message.delete({ timeout: 5000 }));
            } else {
                this.message.channel
                    .send(this.client.embeds.info(this.noAuto))
                    .then(message => message.delete({ timeout: 5000 }));
            }
            return Promise.resolve(false);
        })
        .set(ReactionMethods.Love, async function (this: ReactionHandler): Promise<boolean> {
            try {
                let id = this.display.info.id || this.display.pages[this.#currentPage].id;
                if (!id) return Promise.resolve(false);
                const adding = await this.client.db.User.favorite(this.requestMessage, id);
                this.message.channel
                    .send(
                        this.client.embeds.info(
                            adding ? `Added ${id} to favorites.` : `Removed ${id} from favorites.`
                        )
                    )
                    .then(message => message.delete({ timeout: 5000 }));
                return Promise.resolve(false);
            } catch (err) {
                this.client.logger.error(err);
                this.message.channel.send(this.client.embeds.internalError(err));
                return true;
            }
        })
        .set(ReactionMethods.Blacklist, async function (this: ReactionHandler): Promise<boolean> {
            try {
                const info = this.display.info;
                if (!info) return Promise.resolve(false);
                const { type, name } = info;
                const adding = await this.client.db.User.blacklist(this.requestMessage, info);
                this.message.channel
                    .send(
                        this.client.embeds.info(
                            adding
                                ? `Added ${type} \`${name}\` to blacklist.`
                                : `Removed ${type} \`${name}\` from blacklist.`
                        )
                    )
                    .then(message => message.delete({ timeout: 5000 }));
                return Promise.resolve(false);
            } catch (err) {
                this.client.logger.error(err);
                this.message.channel.send(this.client.embeds.internalError(err));
                return true;
            }
        })
        .set(ReactionMethods.Remove, async function (this: ReactionHandler): Promise<boolean> {
            this.collector.stop();
            if (this.#autoMode) clearInterval(this.#autoMode);
            if (!this.message.deleted) await this.message.delete();
            if (!this.requestMessage.deleted) await this.requestMessage.delete();
            return true;
        })
        .set(ReactionMethods.One, function (this: ReactionHandler): Promise<boolean> {
            return this.choose(this.#currentPage * 5);
        })
        .set(ReactionMethods.Two, function (this: ReactionHandler): Promise<boolean> {
            return this.choose(1 + this.#currentPage * 5);
        })
        .set(ReactionMethods.Three, function (this: ReactionHandler): Promise<boolean> {
            return this.choose(2 + this.#currentPage * 5);
        })
        .set(ReactionMethods.Four, function (this: ReactionHandler): Promise<boolean> {
            return this.choose(3 + this.#currentPage * 5);
        })
        .set(ReactionMethods.Five, function (this: ReactionHandler): Promise<boolean> {
            return this.choose(4 + this.#currentPage * 5);
        });
}
