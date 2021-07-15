import { Client } from '@structures';
import {
    Collection,
    CollectorFilter,
    CommandInteraction,
    InteractionCollector,
    InteractionCollectorOptions,
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
    MessageSelectMenu,
    MessageSelectOptionData,
    TextChannel,
    User,
} from 'discord.js';
import { URL } from 'url';
import { Gallery } from '@api/nhentai';

export enum Interactions {
    First = 'first',
    Back = 'back',
    Jump = 'jump',
    Forward = 'forward',
    Last = 'last',
    Info = 'info',
    Preview = 'preview',
    Return = 'return',
    Select = 'select',
    Love = 'love',
    Follow = 'follow',
    Blacklist = 'blacklist',
    Download = 'download',
    Remove = 'remove',
}

export type Views = 'info' | 'thumbnail';

export interface Info {
    id: string;
    name: string;
}

interface Page {
    galleryID?: Gallery['id'];
    embed: MessageEmbed;
    pages?: Page[];
}

export interface PaginatorOptions extends InteractionCollectorOptions<MessageComponentInteraction> {
    info?: Info;
    filter?: CollectorFilter<[MessageComponentInteraction]>;
    startView?: Views;
    startPage?: number;
    image?: string;
    prompt?: string;
    jumpTimeout?: number;
    collectorTimeout?: number;
    priorityUser?: User['id'];
}

const TAGS = ['tag', 'artist', 'character', 'category', 'group', 'parody', 'language'];

export class Paginator {
    readonly client: Client;
    interaction: CommandInteraction;
    collector: InteractionCollector<MessageComponentInteraction>;
    pages: Record<Views, Page[]>;
    private followedUp: boolean;
    private goBack: { previousView: 'info' | 'thumbnail'; previousPage: number; pages: Page[] };
    private readonly methodMap: Collection<Interactions, MessageButton | MessageSelectMenu>;
    private readonly priorityUser: User['id'] | null;
    private readonly info: Info;
    private readonly filter: CollectorFilter<[MessageComponentInteraction]>;
    private image: string | null;
    private readonly prompt: string;
    private readonly dispose: boolean;
    private readonly jumpTimeout: number;
    private readonly collectorTimeout: number;
    ended = false;
    #currentView: Views;
    #currentPage: number;
    #previewing = false;

    constructor(client: Client, options: PaginatorOptions) {
        this.client = client;
        this.pages = { info: [], thumbnail: [] };
        this.followedUp = false;
        this.methodMap = new Collection<Interactions, MessageButton | MessageSelectMenu>();
        this.priorityUser = options.priorityUser;
        this.info = options.info ?? { id: '', name: '' };
        this.filter = options.filter ?? (() => true);
        this.image = options.image;
        this.prompt = options.prompt ?? 'Which page would you like to jump to?';
        this.jumpTimeout = options.jumpTimeout ?? 30000;
        this.collectorTimeout = options.collectorTimeout ?? 900000;
        this.#currentView = options.startView ?? 'info';
        this.#currentPage = options.startPage ?? 0;
        this.goBack = {
            previousView: this.#currentView,
            previousPage: this.#currentPage,
            pages: [],
        };
        this.assignButtons();
    }

    private assignButtons() {
        this.methodMap
            .set(
                Interactions.First,
                new MessageButton().setCustomId('first').setLabel('<<').setStyle('SECONDARY')
            )
            .set(
                Interactions.Back,
                new MessageButton().setCustomId('back').setLabel('<').setStyle('SECONDARY')
            )
            .set(
                Interactions.Jump,
                new MessageButton()
                    .setCustomId('jump')
                    .setLabel(`${this.#currentPage + 1} of ${this.pages.thumbnail.length}`)
                    .setStyle('SECONDARY')
            )
            .set(
                Interactions.Forward,
                new MessageButton().setCustomId('forward').setLabel('>').setStyle('SECONDARY')
            )
            .set(
                Interactions.Last,
                new MessageButton().setCustomId('last').setLabel('>>').setStyle('SECONDARY')
            )
            .set(
                Interactions.Select,
                new MessageSelectMenu().setCustomId('select').addOptions([
                    {
                        label: 'Info View',
                        description: 'Switch to Info View',
                        value: 'info',
                        emoji: '📄',
                        default: this.#currentView === 'info',
                    },
                    {
                        label: 'Thumbnail View',
                        description: 'Switch to Thumbnail View',
                        value: 'thumbnail',
                        emoji: '🖼️',
                        default: this.#currentView === 'thumbnail',
                    },
                ])
            )
            .set(
                Interactions.Info,
                new MessageButton().setCustomId('info').setLabel('Sauce?').setStyle('PRIMARY')
            )
            .set(
                Interactions.Love,
                new MessageButton().setCustomId('love').setLabel('❤️').setStyle('SECONDARY')
            )
            .set(
                Interactions.Follow,
                new MessageButton().setCustomId('follow').setLabel('🔖').setStyle('SECONDARY')
            )
            .set(
                Interactions.Blacklist,
                new MessageButton().setCustomId('blacklist').setLabel('🏴').setStyle('SECONDARY')
            )
            .set(
                Interactions.Download,
                new MessageButton()
                    .setLabel('📥')
                    .setStyle('LINK')
                    .setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
            )
            .set(
                Interactions.Remove,
                new MessageButton().setCustomId('remove').setLabel('🗑️').setStyle('DANGER')
            );
    }

    private getButtons() {
        const id = this.pages[this.#currentView][this.#currentPage]?.galleryID ?? this.info.id;
        let downloadURL = `https://nhentai-discord-bot-web.herokuapp.com/download/${id}`;
        if (!id) downloadURL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        (this.methodMap.get(Interactions.Download) as MessageButton).setURL(downloadURL);
        (this.methodMap.get(Interactions.Jump) as MessageButton).setLabel(
            `${this.#currentPage + 1} of ${this.pages[this.#currentView].length}`
        );
        const menu: MessageSelectOptionData[] = [
            {
                label: 'Info View',
                description: 'Switch to Info View',
                value: 'info',
                emoji: '📄',
                default: this.#currentView === 'info' && !this.#previewing,
            },
            {
                label: 'Thumbnail View',
                description: 'Switch to Thumbnail View',
                value: 'thumbnail',
                emoji: '🖼️',
                default: this.#currentView === 'thumbnail' && !this.#previewing,
            },
        ];
        if (
            ['home', 'search', 'favorite', ...TAGS].includes(this.interaction.commandName) &&
            (this.pages[this.#currentView][this.#currentPage]?.embed?.image ||
                this.pages[this.#currentView][this.#currentPage]?.embed?.thumbnail)
        ) {
            menu.push({
                label: 'Preview',
                description: 'Take a look at the current doujin',
                value: 'preview',
                emoji: '🔎',
                default: this.#previewing,
            });
        }
        (this.methodMap.get(Interactions.Select) as MessageSelectMenu).spliceOptions(0, 3, menu);
        const naviRow = new MessageActionRow().addComponents([
            this.methodMap.get(Interactions.First),
            this.methodMap.get(Interactions.Back),
            this.methodMap.get(Interactions.Jump),
            this.methodMap.get(Interactions.Forward),
            this.methodMap.get(Interactions.Last),
        ]);
        const optionsRow = new MessageActionRow().addComponents(
            ['home', 'search', ...TAGS].includes(this.interaction.commandName)
                ? [
                      this.methodMap.get(Interactions.Love),
                      this.methodMap.get(Interactions.Follow),
                      this.methodMap.get(Interactions.Blacklist),
                      this.methodMap.get(Interactions.Download),
                      this.methodMap.get(Interactions.Remove),
                  ]
                : ['g', 'random', 'favorite'].includes(this.interaction.commandName)
                ? [
                      this.methodMap.get(Interactions.Love),
                      this.methodMap.get(Interactions.Download),
                      this.methodMap.get(Interactions.Remove),
                  ]
                : [this.methodMap.get(Interactions.Remove)]
        );
        if (this.image) {
            return [
                new MessageActionRow().addComponents([
                    this.methodMap.get(Interactions.Info),
                    this.methodMap.get(Interactions.Remove),
                ]),
            ];
        }
        if (this.interaction.commandName === 'sauce') {
            const url = new URL(
                this.pages[this.#currentView][this.#currentPage]?.embed.description?.match(
                    /\((.+)\)/
                )[1] ?? 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
            );
            const imageURL = url.origin + url.pathname;
            const googleURL = `https://www.google.com/searchbyimage?image_url=${imageURL}&safe=off`,
                tineyeURL = `https://tineye.com/search/?url=${imageURL}`,
                ascii2dURL = `https://ascii2d.net/search/url/${imageURL}`,
                yandexURL = `https://yandex.com/images/search?url=${imageURL}&rpt=imageview`;
            return [
                naviRow,
                new MessageActionRow().addComponents([
                    new MessageButton().setLabel('Google Image').setStyle('LINK').setURL(googleURL),
                    new MessageButton().setLabel('TinEye').setStyle('LINK').setURL(tineyeURL),
                    new MessageButton().setLabel('ascii2d').setStyle('LINK').setURL(ascii2dURL),
                    new MessageButton().setLabel('Yandex').setStyle('LINK').setURL(yandexURL),
                    this.methodMap.get(Interactions.Remove),
                ]),
            ];
        }
        const rows = [];
        if (this.pages[this.#currentView].length > 1) rows.push(naviRow);
        rows.push(optionsRow);
        if (this.pages.thumbnail.length && this.pages.info.length)
            rows.push(
                new MessageActionRow().addComponents(this.methodMap.get(Interactions.Select))
            );
        return rows;
    }

    private async turnPage(interaction: MessageComponentInteraction): Promise<void> {
        this.methodMap.forEach((v, k) => this.methodMap.get(k).setDisabled(!v.disabled));
        await this.update(interaction);
        this.collector.stop('Aborted');
    }

    private async update(interaction: MessageComponentInteraction): Promise<boolean> {
        const content = interaction.message.content;
        await interaction[interaction.deferred || interaction.replied ? 'editReply' : 'update']({
            content: content.length ? content : null,
            embeds: [
                this.pages[this.#currentView][this.#currentPage]?.embed ??
                    this.pages[this.#currentView][0]?.embed,
            ],
            components: this.getButtons(),
        });
        return false;
    }

    addPage(view: Views, page: Page | Page[]) {
        this.pages[view] = this.pages[view].concat(page);
        return this;
    }

    async run(
        interaction: CommandInteraction,
        content = '',
        message: 'followUp' | 'reply' | 'editReply' | Message = interaction.deferred ||
        interaction.replied
            ? 'editReply'
            : 'reply'
    ) {
        if (!interaction.guild) {
            throw new Error(
                'Paginator cannot be used in DMs, as they do not have enough permissions to perform in a UX friendly way.'
            );
        }
        this.interaction = interaction;
        this.followedUp = message === 'followUp';
        const c = {
            content: content.length ? content : null,
            embeds: [this.pages[this.#currentView][this.#currentPage].embed],
            components: this.getButtons(),
            ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
            allowedMentions: { repliedUser: false },
        };
        if (message instanceof Message) {
            message = await message.reply(c);
        } else {
            message = (await this.interaction[message](c)) as Message;
        }
        this.collector = message.createMessageComponentCollector({
            filter: this.filter,
            idle: this.collectorTimeout,
            dispose: this.dispose,
        });
        this.collector.on('collect', async interaction => {
            if (interaction.user.bot) return;
            const method = interaction.customId as Interactions;
            if (!this.methodMap.has(method)) return;
            await interaction.deferUpdate();
            const rip = await this.methods.get(method)?.call(this, interaction);
            if (rip) this.collector.stop();
        });
        return message;
    }

    private methods: Map<
        Interactions,
        (this: Paginator, interaction: MessageComponentInteraction) => Promise<boolean>
    > = new Map()
        .set(
            Interactions.First,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser === interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage === 0) {
                    if (['home', 'search', ...TAGS].includes(this.interaction.commandName)) {
                        if (
                            (this.interaction.commandName === 'home' &&
                                (this.interaction.options.get('page')?.value ?? 1) === 1) ||
                            !this.interaction.options.get('page')
                        )
                            return Promise.resolve(false);
                        this.interaction.options.get('page')!.value =
                            (this.interaction.options.get('page')!.value as number) - 1;
                        await this.turnPage(interaction);
                        try {
                            await this.client.commands
                                .get(this.interaction.commandId)
                                .exec(this.interaction);
                        } catch (err) {} finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage = 0;
                return this.update(interaction);
            }
        )
        .set(
            Interactions.Back,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser === interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage <= 0) {
                    if (['home', 'search', ...TAGS].includes(this.interaction.commandName)) {
                        if (
                            (this.interaction.commandName === 'home' &&
                                (this.interaction.options.get('page')?.value ?? 1) === 1) ||
                            !this.interaction.options.get('page')
                        )
                            return Promise.resolve(false);
                        this.interaction.options.get('page')!.value =
                            (this.interaction.options.get('page')!.value as number) - 1;
                        await this.turnPage(interaction);
                        try {
                            await this.client.commands
                                .get(this.interaction.commandId)
                                .exec(this.interaction);
                        } catch (err) {} finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage--;
                return this.update(interaction);
            }
        )
        .set(
            Interactions.Forward,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser === interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage >= this.pages[this.#currentView].length - 1) {
                    if (['home', 'search', ...TAGS].includes(this.interaction.commandName)) {
                        if (
                            this.interaction.commandName === 'home' &&
                            (this.interaction.options.get('page')?.value ?? 1) === 1
                        ) {
                            if (!this.followedUp) return Promise.resolve(false);
                            else await (interaction.message as Message).delete();
                        }
                        if (!this.interaction.options.get('page'))
                            this.interaction.options.set('page', {
                                name: 'page',
                                type: 'INTEGER',
                                value: 1,
                            });
                        this.interaction.options.get('page')!.value =
                            (this.interaction.options.get('page')!.value as number) + 1;
                            await this.turnPage(interaction);
                        try {
                            await this.client.commands
                                .get(this.interaction.commandId)
                                .exec(this.interaction);
                        } catch (err) {} finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage++;
                return this.update(interaction);
            }
        )
        .set(
            Interactions.Last,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser === interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage === this.pages[this.#currentView].length - 1) {
                    if (['home', 'search', ...TAGS].includes(this.interaction.commandName)) {
                        if (
                            this.interaction.commandName === 'home' &&
                            (this.interaction.options.get('page')?.value ?? 1) === 1
                        ) {
                            if (!this.followedUp) return Promise.resolve(false);
                            else await (interaction.message as Message).delete();
                        }
                        if (!this.interaction.options.get('page'))
                            this.interaction.options.set('page', {
                                name: 'page',
                                type: 'INTEGER',
                                value: 1,
                            });
                        this.interaction.options.get('page')!.value =
                            (this.interaction.options.get('page')!.value as number) + 1;
                            await this.turnPage(interaction);
                        try {
                            await this.client.commands
                                .get(this.interaction.commandId)
                                .exec(this.interaction);
                        } catch (err) {} finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage = this.pages[this.#currentView].length - 1;
                return this.update(interaction);
            }
        )
        .set(
            Interactions.Jump,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser === interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                this.methodMap.get(Interactions.Jump).setDisabled(true);
                await this.update(interaction);
                const message = (await interaction.followUp({
                    content: this.prompt,
                    ephemeral: (this.interaction.options.get('private')?.value as boolean) ?? false,
                })) as Message;
                const collected = await this.interaction.channel.awaitMessages({
                    filter: mess => mess.author === interaction.user,
                    max: 1,
                    idle: this.jumpTimeout,
                });
                this.methodMap.get(Interactions.Jump).setDisabled(false);
                await this.update(interaction);
                await message.delete();
                const response = collected.first();
                if (!response) return Promise.resolve(false);
                const newPage = parseInt(response.content);
                await response.delete();
                if (
                    newPage &&
                    !isNaN(newPage) &&
                    newPage > 0 &&
                    newPage <= this.pages[this.#currentView].length
                ) {
                    this.#currentPage = newPage - 1;
                    return this.update(interaction);
                }
                return Promise.resolve(false);
            }
        )
        .set(
            Interactions.Select,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (interaction.user !== this.interaction.user || !interaction.isSelectMenu())
                    return Promise.resolve(false);
                if (interaction.values.includes('preview')) {
                    if (!this.pages[this.#currentView][this.#currentPage].pages)
                        return Promise.resolve(false);
                    this.goBack = {
                        previousView: this.#currentView,
                        previousPage: this.#currentPage,
                        pages: this.pages.thumbnail,
                    };
                    this.pages.thumbnail = this.pages[this.#currentView][this.#currentPage].pages;
                    this.#currentPage = 0;
                    this.#previewing = true;
                    return this.update(interaction);
                }
                if (
                    ['home', 'search', 'favorite', ...TAGS].includes(
                        this.interaction.commandName
                    ) &&
                    this.#previewing
                ) {
                    if (!this.goBack.pages.length) return Promise.resolve(false);
                    this.#currentView = interaction.values[0] as Views;
                    this.#currentPage = this.goBack.previousPage;
                    this.pages.thumbnail = this.goBack.pages;
                    this.goBack.pages = [];
                    this.#previewing = false;
                    return this.update(interaction);
                }
                this.#currentView = this.#currentView === 'info' ? 'thumbnail' : 'info';
                return this.update(interaction);
            }
        )
        .set(
            Interactions.Info,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                this.interaction.options.set('query', {
                    name: 'query',
                    type: 'STRING',
                    value: this.image,
                });
                await this.client.commandHandler
                    .findCommand('sauce')
                    .exec(this.interaction, { internal: true, user: interaction.user.id });
                return Promise.resolve(false);
            }
        )
        .set(
            Interactions.Love,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                try {
                    let id =
                        this.pages[this.#currentView][this.#currentPage]?.galleryID ?? this.info.id;
                    if (!id) return Promise.resolve(false);
                    const adding = await this.client.db.user.favorite(
                        interaction.user.id,
                        id.toString()
                    );
                    (this.methodMap.get(Interactions.Love) as MessageButton)
                        .setLabel(adding ? `Added ${id}` : `Removed ${id}`)
                        .setEmoji(adding ? '✅' : '❌')
                        .setStyle(adding ? 'SUCCESS' : 'DANGER')
                        .setDisabled(true);
                    await this.update(interaction);
                    setTimeout(async () => {
                        (this.methodMap.get(Interactions.Love) as MessageButton)
                            .setLabel('❤️')
                            .setEmoji('')
                            .setStyle('SECONDARY')
                            .setDisabled(false);
                        await this.update(interaction);
                    }, 3000);
                    return Promise.resolve(false);
                } catch (err) {
                    this.client.logger.error(err);
                    this.interaction.followUp({
                        embeds: [this.client.embeds.internalError(err)],
                        ephemeral: true,
                    });
                    return true;
                }
            }
        )
        .set(
            Interactions.Follow,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                try {
                    const info = { ...this.info, type: this.interaction.commandName };
                    if (!info) return Promise.resolve(false);
                    const { id, type, name } = info;
                    const adding = await this.client.db.user.follow(
                        interaction.user.id,
                        type,
                        +id,
                        name
                    );
                    (this.methodMap.get(Interactions.Follow) as MessageButton)
                        .setLabel(
                            adding
                                ? `Started following ${type} ${name}`
                                : `Stopped following ${type} ${name}`
                        )
                        .setEmoji(adding ? '✅' : '❌')
                        .setStyle(adding ? 'SUCCESS' : 'DANGER')
                        .setDisabled(true);
                    await this.update(interaction);
                    setTimeout(async () => {
                        (this.methodMap.get(Interactions.Follow) as MessageButton)
                            .setLabel('🔖')
                            .setEmoji('')
                            .setStyle('SECONDARY')
                            .setDisabled(false);
                        await this.update(interaction);
                    }, 3000);
                    return Promise.resolve(false);
                } catch (err) {
                    this.client.logger.error(err);
                    this.interaction.followUp({
                        embeds: [this.client.embeds.internalError(err)],
                        ephemeral: true,
                    });
                    return true;
                }
            }
        )
        .set(
            Interactions.Blacklist,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                try {
                    const info = { ...this.info, type: this.interaction.commandName };
                    if (!info) return Promise.resolve(false);
                    const { type, name } = info;
                    const adding = await this.client.db.user.blacklist(interaction.user.id, info);
                    (this.methodMap.get(Interactions.Blacklist) as MessageButton)
                        .setLabel(adding ? `Added ${type} ${name}` : `Removed ${type} ${name}`)
                        .setEmoji(adding ? '✅' : '❌')
                        .setStyle(adding ? 'SUCCESS' : 'DANGER')
                        .setDisabled(true);
                    await this.update(interaction);
                    setTimeout(async () => {
                        (this.methodMap.get(Interactions.Blacklist) as MessageButton)
                            .setLabel('🏴')
                            .setEmoji('')
                            .setStyle('SECONDARY')
                            .setDisabled(false);
                        await this.update(interaction);
                    }, 3000);
                    return Promise.resolve(false);
                } catch (err) {
                    this.client.logger.error(err);
                    this.interaction.followUp({
                        embeds: [this.client.embeds.internalError(err)],
                        ephemeral: true,
                    });
                    return true;
                }
            }
        )
        .set(
            Interactions.Remove,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser === interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                this.collector.stop('Aborted');
                if ((interaction.message as Message).deletable) {
                    await (interaction.message as Message).delete();
                }
                if ((interaction.message as Message).reference) {
                    const { messageId } = (interaction.message as Message).reference;
                    const message = await interaction.channel.messages.fetch(messageId);
                    if (message?.deletable) await message.delete();
                }
                return true;
            }
        );
}
