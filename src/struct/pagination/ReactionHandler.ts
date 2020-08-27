/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/ReactionHandler.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import { Message, ReactionCollector, ReactionCollectorOptions, User } from 'discord.js';
import Embeds from '@nhentai/utils/embeds';
import { Cache } from './Cache';
import { RichDisplay } from './RichDisplay';
import { RichMenu } from './RichMenu';

export interface ReactionHandlerOptions extends ReactionCollectorOptions {
    stop?: boolean;
    prompt?: string;
    startPage?: number;
    max?: number;
    maxEmojis?: number;
    maxUsers?: number;
    jumpTimeout?: number;
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
    Remove = 'remove',
    One = 'one',
    Two = 'two',
    Three = 'three',
    Four = 'four',
    Five = 'five',
}

export class ReactionHandler {
    readonly selection: Promise<number | null>;
    readonly message: Message;
    private readonly display: RichDisplay;
    private readonly methodMap: Map<string, ReactionMethods>;
    private readonly prompt: string;
    private readonly jumpTimeout: number;
    readonly collector: ReactionCollector;
    #ended = false;
    #awaiting = false;
    #currentPage: number;
    #resolve:
        | ((value?: number | PromiseLike<number | null> | null | undefined) => void)
        | null = null;

    constructor(
        message: Message,
        options: ReactionHandlerOptions,
        display: RichDisplay,
        emojis: Cache<ReactionMethods, string>
    ) {
        if (!message.guild)
            throw new Error(
                'RichDisplays and subclasses cannot be used in DMs, as they do not have enough permissions to perform in a UX friendly way.'
            );
        this.message = message;
        this.display = display;
        this.methodMap = new Map(emojis.map((value, key) => [value, key]));
        this.prompt = options.prompt ?? 'Which page would you like to jump to?';
        this.jumpTimeout = options.jumpTimeout ?? 30000;
        this.selection = emojis.has(ReactionMethods.One)
            ? new Promise(resolve => {
                  this.#resolve = resolve;
              })
            : Promise.resolve(null);
        this.#currentPage = options.startPage ?? 0;
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
                !this.message.deleted &&
                this.message.client.guilds.cache.has(this.message.guild!.id)
            ) {
                try {
                    await this.message.reactions.removeAll();
                } catch (error) {
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
        (this: ReactionHandler, user: User) => Promise<boolean>
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
            user: User
        ): Promise<boolean> {
            if (this.#awaiting) return Promise.resolve(false);
            this.#awaiting = true;
            const message = await this.message.channel.send(Embeds.info(this.prompt));
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
            await this.message.edit('', { embed: this.display.infoPage! });
            return false;
        })
        .set(ReactionMethods.Remove, function (this: ReactionHandler): Promise<boolean> {
            return Promise.resolve(this.stop());
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
