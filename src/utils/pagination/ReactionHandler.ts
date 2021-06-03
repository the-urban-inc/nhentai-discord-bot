/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/ReactionHandler.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import { Message, ReactionCollector, ReactionCollectorOptions, User } from 'discord.js';
import { Cache } from './Cache';
import { RichDisplay } from './RichDisplay';
import { RichMenu } from './RichMenu';
import { Client } from '@structures';

export interface ReactionHandlerOptions extends ReactionCollectorOptions {
    users?: string[];
    stop?: boolean;
    prompt?: string;
    promptAuto?: string;
    stopAuto?: string;
    endAuto?: string;
    noAuto?: string;
    startPage?: number;
    danger?: boolean;
    imageURL?: string;
    max?: number;
    maxEmojis?: number;
    maxUsers?: number;
    jumpTimeout?: number;
    autoTimeout?: number;
    messageTimeout?: number;
    collectorTimeout?: number;
    onTimeout?: () => any;
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
    Follow = 'follow',
    Blacklist = 'blacklist',
    Download = 'download',
    Remove = 'remove',
    One = 'one',
    Two = 'two',
    Three = 'three',
    Four = 'four',
    Five = 'five',
}

export class ReactionHandler {
    readonly selection: Promise<number | null>;
    readonly client: Client;
    readonly requestMessage: Message;
    readonly message: Message;
    display: RichDisplay | RichMenu;
    warning: ReactionHandler | null;
    private readonly methodMap: Map<string, ReactionMethods>;
    private readonly users: string[];
    private readonly danger: boolean;
    private imageURL: string;
    private previousSession: ReactionHandler | null;
    private readonly prompt: string;
    private readonly promptAuto: string;
    private readonly stopAuto: string;
    private readonly endAuto: string;
    private readonly noAuto: string;
    private readonly dispose: boolean;
    private readonly jumpTimeout: number;
    private readonly autoTimeout: number;
    private readonly messageTimeout: number;
    private readonly collectorTimeout: number;
    private readonly onTimeout: () => any;
    readonly collector: ReactionCollector;
    ended = false;
    #awaiting = false;
    #info = false;
    #autoMode: NodeJS.Timeout;
    #currentPage: number;
    #resolve: ((value?: number | PromiseLike<number | null> | null | undefined) => void) | null =
        null;

    constructor(
        client: Client,
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
        this.users = options.users ?? [this.requestMessage.author.id];
        this.danger = options.danger ?? false;
        this.imageURL = options.imageURL ?? '';
        this.prompt = options.prompt ?? 'Which page would you like to jump to?';
        this.promptAuto =
            options.promptAuto ??
            'Starting auto session.\nHow many seconds would you prefer me waiting in between pages?';
        this.stopAuto = options.stopAuto ?? 'Stopped current auto session.';
        this.endAuto = options.endAuto ?? 'Reached last page. Stopping auto session.';
        this.noAuto = options.noAuto ?? "There's no existing auto session. Nothing happened.";
        this.jumpTimeout = options.jumpTimeout ?? 30000;
        this.autoTimeout = options.autoTimeout ?? 30000;
        this.messageTimeout = options.messageTimeout ?? 5000;
        this.collectorTimeout = options.collectorTimeout ?? 900000;
        this.onTimeout = options.onTimeout ?? (() => { return; });
        this.dispose = options.dispose ?? true;
        this.selection = emojis.has(ReactionMethods.One)
            ? new Promise(resolve => {
                  this.#resolve = resolve;
              })
            : Promise.resolve(null);
        this.#info =
            !isNaN(options.startPage) && options.startPage > 0
                ? false
                : !!this.display.infoPage ?? false;
        this.#currentPage = options.startPage ?? 0;
        this.run([...emojis.values()]);
        this.collector = this.message.createReactionCollector(() => true, {
            max: options.max,
            maxEmojis: options.maxEmojis,
            maxUsers: options.maxUsers,
            idle: this.collectorTimeout,
            dispose: this.dispose,
        });
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
        this.collector.on('end', async (collected, reason) => {
            if (reason === 'idle') this.onTimeout();
        });
    }

    public async stop(): Promise<boolean> {
        if (
            this.message &&
            !this.message.deleted &&
            this.message.client.guilds.cache.has(this.message.guild!.id)
        ) {
            try {
                await this.message.reactions.removeAll();
            } catch (error) {
                // 10008 Unknown Message
                // 50013 Missing Permissions
                if (error.code === 10008 || error.code === 50013) return true;
                this.message.client.emit('error', error);
            }
        }
        this.ended = true;
        if (this.#resolve) this.#resolve(null);
        return true;
    }

    private choose(value: number): Promise<boolean> {
        if ((this.display as RichMenu).choices.length - 1 < value) return Promise.resolve(false);
        this.#resolve!(value);
        this.ended = true;
        return Promise.resolve(true);
    }

    private async run(emojis: Array<string>): Promise<void> {
        await this.setup(emojis);
    }

    private async update(): Promise<boolean> {
        if (this.message.deleted) return true;
        this.#info = false;
        await this.message.edit(this.message.content, {
            embed: this.display.pages[this.#currentPage].embed,
        });
        return false;
    }

    private async setup(emojis: Array<string>): Promise<boolean> {
        if (this.message.deleted) return this.stop();
        if (this.ended) return true;
        try {
            this.message.react(emojis.shift() as string);
        } catch {
            return this.stop();
        }
        if (emojis.length) return this.setup(emojis);
        return false;
    }

    private methods: Map<ReactionMethods, (this: ReactionHandler, user: User) => Promise<boolean>> =
        new Map()
            .set(
                ReactionMethods.First,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    if (this.#currentPage === 0) {
                        if (this.display.caller === 'g') return Promise.resolve(false);
                        const cmd = this.client.commandHandler.findCommand(
                            this.display.caller ?? ''
                        );
                        if (cmd) {
                            const ok = await cmd.movePage?.(this, -1);
                            if (ok) {
                                this.#currentPage = 0;
                                return this.update();
                            }
                            return Promise.resolve(!!ok);
                        }
                        return Promise.resolve(false);
                    }
                    this.#currentPage = 0;
                    return this.update();
                }
            )
            .set(
                ReactionMethods.Back,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    if (this.#currentPage <= 0) {
                        if (this.display.caller === 'g') return Promise.resolve(false);
                        const cmd = this.client.commandHandler.findCommand(
                            this.display.caller ?? ''
                        );
                        if (cmd) {
                            const ok = await cmd.movePage?.(this, -1);
                            if (ok) {
                                this.#currentPage = 0;
                                return this.update();
                            }
                            return Promise.resolve(!!ok);
                        }
                        return Promise.resolve(false);
                    }
                    this.#currentPage--;
                    return this.update();
                }
            )
            .set(
                ReactionMethods.Forward,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    if (
                        this.#info &&
                        this.#currentPage === 0 &&
                        (!this.display.caller || this.display.caller === 'g')
                    )
                        return this.update();
                    if (this.#currentPage >= this.display.pages.length - 1) {
                        if (this.display.caller === 'g') {
                            if (!this.display.infoPage) {
                                const gallery = this.display.pages[this.#currentPage].gallery;
                                if (!gallery) return false;
                                this.display.infoPage = this.client.embeds.displayGalleryInfo(
                                    gallery,
                                    this.danger
                                ).info;
                            }
                            await this.message.edit(this.message.content, {
                                embed: this.display.infoPage,
                            });
                            this.#info = true;
                            this.display.infoPage = null;
                            this.#currentPage = 0;
                            return false;
                        }
                        const cmd = this.client.commandHandler.findCommand(
                            this.display.caller ?? ''
                        );
                        if (cmd) {
                            const ok = await cmd.movePage?.(this, 1);
                            if (ok) {
                                this.#currentPage = 0;
                                return this.update();
                            }
                            return Promise.resolve(!!ok);
                        }
                        return Promise.resolve(false);
                    }
                    this.#currentPage++;
                    return this.update();
                }
            )
            .set(
                ReactionMethods.Last,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    if (this.#currentPage === this.display.pages.length - 1) {
                        if (this.display.caller === 'g') return Promise.resolve(false);
                        const cmd = this.client.commandHandler.findCommand(
                            this.display.caller ?? ''
                        );
                        if (cmd) {
                            const ok = await cmd.movePage?.(this, 1);
                            if (ok) {
                                this.#currentPage = 0;
                                return this.update();
                            }
                            return Promise.resolve(!!ok);
                        }
                        return Promise.resolve(false);
                    }
                    this.#currentPage = this.display.pages.length - 1;
                    return this.update();
                }
            )
            .set(
                ReactionMethods.Jump,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    if (this.#awaiting) return Promise.resolve(false);
                    this.#awaiting = true;
                    const message = await this.message.channel.send(
                        this.client.embeds.info(this.prompt)
                    );
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
                }
            )
            .set(
                ReactionMethods.Info,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.message.deleted) return true;
                    if (this.imageURL && this.imageURL.length) {
                        if (!this.previousSession) this.previousSession = this;
                        else if (!this.previousSession.ended) return false;
                        const command = this.client.commandHandler.findCommand('sauce');
                        this.previousSession = await command.exec(this.requestMessage, {
                            query: this.imageURL,
                            tag: user.tag,
                            users: [],
                            removeRequest: false,
                        });
                        return false;
                    }
                    if (this.users.length && !this.users.includes(user.id)) return false;
                    if (this.#info) return this.update();
                    if (this.display.pages[this.#currentPage].gallery) {
                        const gallery = this.display.pages[this.#currentPage].gallery;
                        this.display.infoPage = this.client.embeds.displayGalleryInfo(
                            gallery,
                            this.danger
                        ).info;
                    }
                    await this.message.edit(this.message.content, { embed: this.display.infoPage });
                    this.#info = true;
                    return false;
                }
            )
            .set(
                ReactionMethods.Auto,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
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
                                .then(message => message.delete({ timeout: this.messageTimeout }));
                        }
                        this.#currentPage++;
                        this.update();
                    }, seconds * 1000);
                    return Promise.resolve(false);
                }
            )
            .set(
                ReactionMethods.Pause,
                function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    if (this.#autoMode) {
                        clearInterval(this.#autoMode);
                        this.message.channel
                            .send(this.client.embeds.info(this.stopAuto))
                            .then(message => message.delete({ timeout: this.messageTimeout }));
                    } else {
                        this.message.channel
                            .send(this.client.embeds.info(this.noAuto))
                            .then(message => message.delete({ timeout: this.messageTimeout }));
                    }
                    return Promise.resolve(false);
                }
            )
            .set(
                ReactionMethods.Love,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    try {
                        let id =
                            this.display.pages[this.#currentPage]?.gallery?.id ||
                            this.display.info.id;
                        if (!id) return Promise.resolve(false);
                        const adding = await this.client.db.User.favorite(user, id.toString());
                        this.message.channel
                            .send(
                                this.client.embeds
                                    .info(
                                        adding
                                            ? `Added ${id} to favorites.`
                                            : `Removed ${id} from favorites.`
                                    )
                                    .setFooter(user.tag, user.displayAvatarURL())
                            )
                            .then(message => message.delete({ timeout: this.messageTimeout }));
                        return Promise.resolve(false);
                    } catch (err) {
                        this.client.logger.error(err);
                        this.message.channel.send(this.client.embeds.internalError(err));
                        return true;
                    }
                }
            )
            .set(
                ReactionMethods.Follow,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    try {
                        const info = this.display.info;
                        if (!info) return Promise.resolve(false);
                        const { id, type, name } = info;
                        this.client.notifier.send({
                            tag: +id,
                            type,
                            name,
                            channel: this.message.channel.id,
                            user: user.id,
                        });
                        return Promise.resolve(false);
                    } catch (err) {
                        this.client.logger.error(err);
                        this.message.channel.send(this.client.embeds.internalError(err));
                        return true;
                    }
                }
            )
            .set(
                ReactionMethods.Blacklist,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    try {
                        const info = this.display.info;
                        if (!info) return Promise.resolve(false);
                        const { type, name } = info;
                        const adding = await this.client.db.User.blacklist(user, info);
                        this.message.channel
                            .send(
                                this.client.embeds
                                    .info(
                                        adding
                                            ? `Added ${type} \`${name}\` to blacklist.`
                                            : `Removed ${type} \`${name}\` from blacklist.`
                                    )
                                    .setFooter(user.tag, user.displayAvatarURL())
                            )
                            .then(message => message.delete({ timeout: this.messageTimeout }));
                        return Promise.resolve(false);
                    } catch (err) {
                        this.client.logger.error(err);
                        this.message.channel.send(this.client.embeds.internalError(err));
                        return true;
                    }
                }
            )
            .set(
                ReactionMethods.Download,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    try {
                        const id =
                            this.display.pages[this.#currentPage]?.gallery?.id ||
                            this.display.info.id;
                        if (!id) return Promise.resolve(false);
                        this.message.channel
                            .send(
                                this.client.embeds
                                    .info(
                                        `Click [here](https://nhentai-discord-bot-web.herokuapp.com/download/${id}) to download ${id}`
                                    )
                                    .setFooter(user.tag, user.displayAvatarURL())
                            )
                            .then(message => message.delete({ timeout: 60000 }));
                        return Promise.resolve(false);
                    } catch (err) {
                        this.client.logger.error(err);
                        this.message.channel.send(this.client.embeds.internalError(err));
                        return true;
                    }
                }
            )
            .set(
                ReactionMethods.Remove,
                async function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    this.collector.stop('Aborted');
                    await this.stop();
                    if (this.#autoMode) clearInterval(this.#autoMode);
                    if (!this.message.deleted) await this.message.delete();
                    if (!this.requestMessage.deleted && this.display.options.removeRequest)
                        await this.requestMessage.delete();
                    return true;
                }
            )
            .set(
                ReactionMethods.One,
                function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    return this.choose(this.#currentPage * 5);
                }
            )
            .set(
                ReactionMethods.Two,
                function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    return this.choose(1 + this.#currentPage * 5);
                }
            )
            .set(
                ReactionMethods.Three,
                function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    return this.choose(2 + this.#currentPage * 5);
                }
            )
            .set(
                ReactionMethods.Four,
                function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    return this.choose(3 + this.#currentPage * 5);
                }
            )
            .set(
                ReactionMethods.Five,
                function (this: ReactionHandler, user: User): Promise<boolean> {
                    if (this.users.length && !this.users.includes(user.id))
                        return Promise.resolve(false);
                    return this.choose(4 + this.#currentPage * 5);
                }
            );
}
