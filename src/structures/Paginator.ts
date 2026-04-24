import { Client, Command } from '@structures';
import {
    Collection,
    CollectedInteraction,
    CommandInteraction,
    ContextMenuCommandInteraction,
    InteractionCollector,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    SnowflakeUtil,
    TextChannel,
    User,
    EmbedBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    ThreadChannel,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    AnySelectMenuInteraction,
} from 'discord.js';
import { Gallery } from '@api/nhentai';

export enum Interactions {
    First = 'first',
    Back = 'back',
    Jump = 'jump',
    Forward = 'forward',
    Last = 'last',
    Info = 'info',
    Preview = 'preview',
    Select = 'select',
    Love = 'love',
    Follow = 'follow',
    Blacklist = 'blacklist',
    Filter = 'filter',
    Remove = 'remove',
    Enqueue = 'enqueue',
}

export type Views = 'info' | 'thumbnail';

export interface Info {
    id: string;
    name: string;
}

interface Page {
    galleryID?: Gallery['id'];
    embed: EmbedBuilder;
    pages?: Page[];
}

export interface PaginatorOptions {
    info?: Info;
    filter?: (interaction: MessageComponentInteraction) => boolean;
    startView?: Views;
    startPage?: number;
    commandPage?: number;
    image?: string;
    prompt?: string;
    jumpTimeout?: number;
    collectorTimeout?: number;
    priorityUser?: User;
    filterIDs?: number[];
    dispose?: boolean;
    /** Full gallery — set by displayLazyFullGallery so loadGalleryPages can reuse it instead of re-fetching. */
    gallery?: Gallery;
}

const TAGS = ['tag', 'artist', 'character', 'category', 'group', 'parody', 'language'];
const DEFAULT_JUMP_TIMEOUT = 30_000;
const DEFAULT_COLLECTOR_TIMEOUT = 900_000;

export class Paginator {
    readonly client: Client;
    readonly id: bigint;
    interaction!: CommandInteraction | ContextMenuCommandInteraction;
    collector!: InteractionCollector<CollectedInteraction>;
    pages: Record<Views, Page[]> = { info: [], thumbnail: [] };
    filteredPages: Record<Views, Page[]> = { info: [], thumbnail: [] };
    private followedUp = false;
    selection: Promise<number | null> = Promise.resolve(null);
    private goBack: { previousView: Views; previousPage: number; pages: Page[] } = {
        previousView: 'info',
        previousPage: 0,
        pages: [],
    };
    private readonly methodMap = new Collection<
        Interactions,
        ButtonBuilder | StringSelectMenuBuilder
    >();
    private readonly priorityUser: User | null;
    private filterIDs: number[] = [];
    private readonly info: Info;
    private readonly filter: (interaction: MessageComponentInteraction) => boolean;
    private readonly gallery: Gallery | undefined;
    private image: string | null = null;
    private ephemeral = false;
    private readonly prompt: string;
    private readonly dispose: boolean;
    private readonly jumpTimeout: number;
    private readonly collectorTimeout: number;
    private readonly currentCommandPage: number;
    ended = false;
    #currentView: Views;
    #currentPage: number;
    #previewing = false;
    #resolve: ((value?: number | PromiseLike<number | null> | null | undefined) => void) | null =
        null;

    constructor(client: Client, options: PaginatorOptions = {}) {
        this.client = client;
        this.id = SnowflakeUtil.generate();
        this.client.paginators.set(this.id, this);
        this.priorityUser = options.priorityUser ?? null;
        this.filterIDs = options.filterIDs ?? [];
        this.info = options.info ?? { id: '', name: '' };
        this.filter = options.filter ?? (() => true);
        this.image = options.image ?? null;
        this.ephemeral = false;
        this.prompt = options.prompt ?? 'Which page would you like to jump to?';
        this.dispose = options.dispose ?? false;
        this.jumpTimeout = options.jumpTimeout ?? DEFAULT_JUMP_TIMEOUT;
        this.collectorTimeout = options.collectorTimeout ?? DEFAULT_COLLECTOR_TIMEOUT;
        this.currentCommandPage = options.commandPage ?? 1;
        this.gallery = options.gallery;
        this.#currentView = options.startView ?? 'info';
        this.#currentPage = options.startPage ?? 0;
        this.assignButtons();
    }

    private makeButton(
        id: string,
        label: string,
        style: ButtonStyle | number = ButtonStyle.Secondary
    ) {
        return new ButtonBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style as any);
    }

    private assignButtons() {
        this.methodMap
            .set(
                Interactions.First,
                this.makeButton(this.id + ' first', '<<', ButtonStyle.Secondary)
            )
            .set(Interactions.Back, this.makeButton(this.id + ' back', '<', ButtonStyle.Secondary))
            .set(
                Interactions.Jump,
                this.makeButton(
                    this.id + ' jump',
                    `${this.#currentPage + 1} of ${this.pages.thumbnail.length}`,
                    ButtonStyle.Secondary
                )
            )
            .set(
                Interactions.Forward,
                this.makeButton(this.id + ' forward', '>', ButtonStyle.Secondary)
            )
            .set(Interactions.Last, this.makeButton(this.id + ' last', '>>', ButtonStyle.Secondary))
            .set(
                Interactions.Info,
                this.makeButton(this.id + ' info', 'Sauce?', ButtonStyle.Primary)
            )
            .set(
                Interactions.Select,
                new StringSelectMenuBuilder().setCustomId(this.id + ' select').addOptions([])
            )
            .set(Interactions.Love, this.makeButton(this.id + ' love', '❤️', ButtonStyle.Secondary))
            .set(
                Interactions.Follow,
                this.makeButton(this.id + ' follow', '🔖', ButtonStyle.Secondary)
            )
            .set(
                Interactions.Blacklist,
                this.makeButton(this.id + ' blacklist', '🏴', ButtonStyle.Secondary)
            )
            .set(
                Interactions.Filter,
                new ButtonBuilder()
                    .setCustomId(this.id + ' filter')
                    .setLabel(`👁️\u00A0\u00A0Click here to see ${this.filterIDs.length} filtered galleries`)
                    .setStyle(ButtonStyle.Secondary)
            )
            .set(
                Interactions.Remove,
                this.makeButton(this.id + ' remove', '🗑️', ButtonStyle.Danger)
            )
            .set(
                Interactions.Enqueue,
                this.makeButton(
                    this.id + ' enqueue',
                    '⏯️\u2000Enqueue this track to the playlist',
                    ButtonStyle.Primary
                )
            );
    }

    private buildSelectOptions(): StringSelectMenuOptionBuilder[] {
        const menu: StringSelectMenuOptionBuilder[] = [];
        if (this.#previewing) {
            menu.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Info View')
                    .setDescription('Show gallery info')
                    .setValue('info')
                    .setEmoji('📄')
                    .setDefault(this.#currentView === 'info'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Thumbnail View')
                    .setDescription('Browse gallery pages')
                    .setValue('thumbnail')
                    .setEmoji('🖼️')
                    .setDefault(this.#currentView === 'thumbnail')
            );
        } else {
            menu.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Info View')
                    .setDescription('Switch to Info View')
                    .setValue('info')
                    .setEmoji('📄')
                    .setDefault(this.#currentView === 'info'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Thumbnail View')
                    .setDescription('Switch to Thumbnail View')
                    .setValue('thumbnail')
                    .setEmoji('🖼️')
                    .setDefault(this.#currentView === 'thumbnail')
            );
            if (
                ['home', 'search', 'favorite', ...TAGS].includes(this.interaction.commandName)
            ) {
                menu.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Browse Gallery')
                        .setDescription('Browse the pages of the current gallery')
                        .setValue('preview')
                        .setEmoji('🔎')
                );
            }
        }
        return menu;
    }

    private getButtons() {
        const id = this.pages[this.#currentView][this.#currentPage]?.galleryID ?? this.info.id;
        (this.methodMap.get(Interactions.Jump) as ButtonBuilder).setLabel(
            `${this.#currentPage + 1} of ${this.pages[this.#currentView].length}`
        );
        (this.methodMap.get(Interactions.Select) as StringSelectMenuBuilder).spliceOptions(
            0,
            3,
            this.buildSelectOptions()
        );

        const naviRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
            this.methodMap.get(Interactions.First) as ButtonBuilder,
            this.methodMap.get(Interactions.Back) as ButtonBuilder,
            this.methodMap.get(Interactions.Jump) as ButtonBuilder,
            this.methodMap.get(Interactions.Forward) as ButtonBuilder,
            this.methodMap.get(Interactions.Last) as ButtonBuilder,
        ]);

        const isTag = TAGS.includes(this.interaction.commandName);
        const baseOptions = isTag
            ? [Interactions.Love, Interactions.Follow, Interactions.Blacklist, Interactions.Remove]
            : ['home', 'search', 'g', 'random', 'favorite'].includes(this.interaction.commandName)
            ? [Interactions.Love, Interactions.Remove]
            : ['play'].includes(this.interaction.commandName)
            ? [Interactions.Enqueue, Interactions.Remove]
            : [Interactions.Remove];

        // Preview mode: same nav + options, but select menu lets user swap views or return to list
        if (this.#previewing) {
            const previewOptionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                [Interactions.Love, Interactions.Remove].map(k =>
                    this.methodMap.get(k as Interactions) as ButtonBuilder
                )
            );
            return [
                naviRow,
                previewOptionsRow,
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    this.methodMap.get(Interactions.Select) as StringSelectMenuBuilder
                ),
            ];
        }

        const optionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            baseOptions.map(k => this.methodMap.get(k as Interactions) as ButtonBuilder)
        );

        const channel = this.interaction.channel as TextChannel | ThreadChannel | null;
        try {
            if (
                this.ephemeral ||
                !channel?.permissionsFor(this.interaction.guild.members.me)?.has(PermissionFlagsBits.ManageMessages) ||
                !channel?.permissionsFor(this.interaction.guild.members.me)?.has(PermissionFlagsBits.ViewChannel) ||
                !channel?.permissionsFor(this.interaction.guild.members.me)?.has(PermissionFlagsBits.ReadMessageHistory)
            ) {
                const comps = optionsRow.components;
                comps.splice(-1, 1);
                optionsRow.setComponents(comps as any);
            }
        } catch (err) {
            // ignore permission checks failures
        }

        if (
            this.image &&
            this.interaction.commandName !== 'sauce' &&
            this.interaction.commandName !== 'saucenao' &&
            !this.priorityUser
        ) {
            return [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    this.ephemeral
                        ? [this.methodMap.get(Interactions.Info) as ButtonBuilder]
                        : [
                              this.methodMap.get(Interactions.Info) as ButtonBuilder,
                              this.methodMap.get(Interactions.Remove) as ButtonBuilder,
                          ]
                ),
            ];
        }

        if (
            this.interaction.commandName === 'sauce' ||
            this.interaction.commandName === 'saucenao' ||
            (this.image && this.priorityUser)
        ) {
            const imageURL = this.image as string;
            const googleURL = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(
                imageURL
            )}&safe=off`;
            const tineyeURL = `https://tineye.com/search/?url=${encodeURIComponent(imageURL)}`;
            const ascii2dURL = `https://ascii2d.net/search/url/${encodeURIComponent(imageURL)}`;
            const yandexURL = `https://yandex.com/images/search?url=${encodeURIComponent(
                imageURL
            )}&rpt=imageview`;
            const others = [
                new ButtonBuilder()
                    .setLabel('Google Lens')
                    .setStyle(ButtonStyle.Link)
                    .setURL(googleURL),
                new ButtonBuilder().setLabel('TinEye').setStyle(ButtonStyle.Link).setURL(tineyeURL),
                new ButtonBuilder()
                    .setLabel('ascii2d')
                    .setStyle(ButtonStyle.Link)
                    .setURL(ascii2dURL),
                new ButtonBuilder().setLabel('Yandex').setStyle(ButtonStyle.Link).setURL(yandexURL),
                this.methodMap.get(Interactions.Remove) as ButtonBuilder,
            ];
            return [
                naviRow,
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    this.ephemeral ? (others.splice(0, others.length - 1) as any) : (others as any)
                ),
            ];
        }

        const rows: ActionRowBuilder<any>[] = [];
        if (this.pages[this.#currentView].length > 1) rows.push(naviRow);
        if ((optionsRow.components as any[]).length) rows.push(optionsRow as any);
        if (this.filterIDs.length && !this.#previewing)
            rows.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    this.methodMap.get(Interactions.Filter) as ButtonBuilder
                ) as any
            );
        if (this.pages.thumbnail.length && this.pages.info.length)
            rows.push(
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    this.methodMap.get(Interactions.Select) as StringSelectMenuBuilder
                ) as any
            );
        return rows;
    }

    private getLoadingComponents() {
        // Simple single-row loading state to avoid mutating existing builders
        return [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(this.id + ' loading')
                    .setEmoji({ name: '⏳' })
                    .setLabel('Loading…')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            ),
        ];
    }

    private getDisabledComponents() {
        const rows = this.getButtons();
        const disabledRows: ActionRowBuilder<any>[] = [];
        for (const row of rows) {
            const action = new ActionRowBuilder<any>();
            const comps = (row as any).components ?? [];
            for (const comp of comps) {
                const data = typeof comp?.toJSON === 'function' ? comp.toJSON() : comp?.data ?? comp;
                if (!data) continue;

                // Button
                if (data.type === 2) {
                    const b = new ButtonBuilder().setDisabled(true as any);
                    if (data.custom_id ?? data.customId) b.setCustomId(data.custom_id ?? data.customId);
                    if (data.url) b.setURL(data.url);
                    if (data.label) b.setLabel(data.label);
                    if (data.style) b.setStyle(data.style as any);
                    if (data.emoji) b.setEmoji(data.emoji as any);
                    action.addComponents(b as any);
                    continue;
                }

                // Select menu
                if (data.type === 3 || data.options) {
                    const s = new StringSelectMenuBuilder().setDisabled(true);
                    if (data.custom_id ?? data.customId) s.setCustomId(data.custom_id ?? data.customId);
                    if (data.options && data.options.length) s.spliceOptions(0, data.options.length, ...(data.options as any));
                    action.addComponents(s as any);
                    continue;
                }

                // fallback: try adding original component
                action.addComponents(comp as any);
            }
            disabledRows.push(action);
        }
        return disabledRows;
    }

    private async update(
        interaction: MessageComponentInteraction | AnySelectMenuInteraction
    ): Promise<boolean> {
        const content = interaction.message.content;
        await interaction[interaction.deferred || interaction.replied ? 'editReply' : 'update']({
            content: content.length ? content : null,
            embeds: this.pages[this.#currentView].length
                ? [
                      this.pages[this.#currentView][this.#currentPage]?.embed ??
                          this.pages[this.#currentView][0]?.embed,
                  ]
                : [],
            components: this.getButtons(),
        } as any);
        return false;
    }

    addPage(view: Views, page: Page | Page[]) {
        this.pages[view] = this.pages[view].concat(page as any);
        return this;
    }

    private async loadGalleryPages(id: number): Promise<Page[]> {
        // Reuse already-fetched gallery from the /g command flow (cache miss → nhentai.g path)
        if (this.gallery) {
            return this.client.embeds.getPages(this.gallery);
        }
        try {
            const g = await this.client.nhentai.g(Math.abs(id));
            return this.client.embeds.getPages(g.gallery);
        } catch (err) {
            // fallback to MariaDB cache, then edu guess
            this.client.logger.warn('loadGalleryPages: nhentai.g failed, trying cache', err.message);
            const doujin = await this.client.db.cache.getDoujin(Math.abs(id)).catch(err => {
                this.client.logger.warn('loadGalleryPages: MariaDB cache miss for', id, err.message);
                return null;
            });
            return this.client.embeds.getEduGuessPages(doujin as any);
        }
    }

    async run(
        interaction: CommandInteraction | ContextMenuCommandInteraction,
        content = '',
        type: 'followUp' | 'reply' | 'editReply' = 'editReply'
    ) {
        if (!interaction.guild) throw new Error('Paginator cannot be used in DMs');
        this.interaction = interaction;
        this.selection =
            this.interaction.commandName === 'play'
                ? new Promise(resolve => (this.#resolve = resolve))
                : Promise.resolve(null);
        this.followedUp = type === 'followUp';
        this.#currentView = ['g', 'random', 'favorite'].includes(this.interaction.commandName)
            ? this.#currentPage > 0
                ? 'thumbnail'
                : 'info'
            : 'thumbnail';

        if (this.filterIDs.length) {
            this.filteredPages = { ...this.pages };
            this.pages = {
                info: this.pages.info.filter(page => !this.filterIDs.includes(+page.galleryID!)),
                thumbnail: this.pages.thumbnail.filter(
                    page => !this.filterIDs.includes(+page.galleryID!)
                ),
            };
        }

        this.ephemeral = (this.interaction as any).ephemeral ?? false;
        const payload: any = {
            content: content.length ? content : null,
            embeds: this.pages[this.#currentView].length
                ? [this.pages[this.#currentView][this.#currentPage].embed]
                : [],
            components: this.getButtons(),
            allowedMentions: { repliedUser: false },
        };
        if (this.ephemeral) payload.flags = MessageFlags.Ephemeral;

        const message = (await this.interaction[type](payload)) as Message;

        this.collector = message.createMessageComponentCollector({
            filter: this.filter as any,
            idle: this.collectorTimeout,
            dispose: this.dispose,
        });
        this.collector.on('collect', async interaction => {
            try {
                if (interaction.user.bot) return;
                let method = interaction.customId as string;
                if (!method.startsWith(this.id.toString())) return;
                method = method.slice(this.id.toString().length + 1);
                if (!this.methodMap.has(method as Interactions)) return;
                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                const handler = this.methods.get(method as Interactions);
                if (!handler) return;
                const rip = await handler.call(this, interaction as MessageComponentInteraction);
                if (rip) this.collector.stop();
            } catch (err: any) {
                try {
                    this.client.logger.error(err);
                    if (interaction && !interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                    await interaction.followUp({ content: 'An internal error occurred while handling this interaction.', flags: MessageFlags.Ephemeral } as any).catch(() => null);
                } catch (e) {
                    // swallow - we don't want to throw from the collector
                }
            }
        });

        this.collector.on('end', () => this.client.paginators.delete(this.id));
        return message;
    }

    private choose(value: number): Promise<boolean> {
        this.#resolve!(value);
        this.collector.stop('Chosen');
        return Promise.resolve(true);
    }

    private methods: Map<
        Interactions,
        (this: Paginator, interaction: MessageComponentInteraction) => Promise<boolean>
    > = new Map([
        [
            Interactions.First,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return false;
                if (this.#currentPage === 0) {
                    if (
                        ['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)
                    ) {
                        if (this.currentCommandPage === 1) return false;
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return false;
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.update(interaction);
                        }
                        try {
                            // show loading state to the user
                            if (!interaction.deferred && !interaction.replied)
                                await interaction.deferUpdate();
                            await interaction
                                .editReply({ components: this.getLoadingComponents() } as any)
                                .catch(() => null);
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage - 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.update(interaction);
                        } finally {
                            return false;
                        }
                    }
                    return false;
                }
                this.#currentPage = 0;
                await this.update(interaction);
                return false;
            },
        ],
        [
            Interactions.Back,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return false;
                if (this.#currentPage <= 0) {
                    if (
                        ['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)
                    ) {
                        if (this.currentCommandPage === 1) return false;
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return false;
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.update(interaction);
                        }
                        try {
                            if (!interaction.deferred && !interaction.replied)
                                await interaction.deferUpdate();
                            await interaction
                                .editReply({ components: this.getLoadingComponents() } as any)
                                .catch(() => null);
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage - 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.update(interaction);
                        } finally {
                            return false;
                        }
                    }
                    return false;
                }
                this.#currentPage--;
                await this.update(interaction);
                return false;
            },
        ],
        [
            Interactions.Forward,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return false;
                if (this.#currentPage >= this.pages[this.#currentView].length - 1) {
                    if (
                        ['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)
                    ) {
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return false;
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.update(interaction);
                        }
                        try {
                            if (!interaction.deferred && !interaction.replied)
                                await interaction.deferUpdate();
                            await interaction
                                .editReply({ components: this.getLoadingComponents() } as any)
                                .catch(() => null);
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage + 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.update(interaction);
                        } finally {
                            return false;
                        }
                    }
                    return false;
                }
                this.#currentPage++;
                await this.update(interaction);
                return false;
            },
        ],
        [
            Interactions.Last,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return false;
                if (this.#currentPage === this.pages[this.#currentView].length - 1) {
                    if (
                        ['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)
                    ) {
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return false;
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.update(interaction);
                        }
                        try {
                            if (!interaction.deferred && !interaction.replied)
                                await interaction.deferUpdate();
                            await interaction
                                .editReply({ components: this.getLoadingComponents() } as any)
                                .catch(() => null);
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage + 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.update(interaction);
                        } finally {
                            return false;
                        }
                    }
                    return false;
                }
                this.#currentPage = this.pages[this.#currentView].length - 1;
                await this.update(interaction);
                return false;
            },
        ],
        [
            Interactions.Jump,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return false;
                const modal = new ModalBuilder()
                    .setCustomId(this.id.toString())
                    .setTitle(this.client.user.username);
                const pageInput = new TextInputBuilder()
                    .setCustomId('pageInput')
                    .setLabel(this.prompt)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
                    pageInput
                );
                modal.addComponents(firstActionRow as any);
                await interaction.showModal(modal);
                const response = await interaction.awaitModalSubmit({
                    filter: mint => mint.user === interaction.user,
                    time: 15000,
                    idle: this.jumpTimeout,
                });
                await response.deferUpdate();
                const input = response.fields.getTextInputValue('pageInput');
                const newPage = parseInt(input);
                if (
                    !input ||
                    isNaN(newPage) ||
                    newPage < 1 ||
                    newPage > this.pages[this.#currentView].length
                ) {
                    await interaction.followUp({
                        content: `Invalid page number. Please enter a number between 1 and ${this.pages[this.#currentView].length}.`,
                        flags: MessageFlags.Ephemeral,
                    } as any);
                    return false;
                }
                this.#currentPage = newPage - 1;
                await this.update(interaction);
                return false;
            },
        ],
        [
            Interactions.Info,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.client.paginators.some(
                        p => p.image === this.image && p.priorityUser?.id === interaction.user.id
                    )
                )
                    return false;
                await (this.client.commands.get('sauce') as Command).run(
                    this.interaction as CommandInteraction,
                    ((await this.interaction.fetchReply()) as Message).embeds[0].image.url,
                    { external: true, user: interaction.user } as any
                );
                return false;
            },
        ],
        [
            Interactions.Select,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (interaction.user !== this.interaction.user || !interaction.isStringSelectMenu())
                    return false;
                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                await interaction.editReply({ components: this.getDisabledComponents() } as any).catch(() => null);

                // Info/thumbnail: always exit preview and return to gallery list in the chosen view
                if (interaction.values.includes('info') || interaction.values.includes('thumbnail')) {
                    if (this.#previewing) {
                        if (!this.goBack.pages.length) return false;
                        this.#currentView = interaction.values.includes('info') ? 'info' : 'thumbnail';
                        this.#currentPage = this.goBack.previousPage;
                        this.pages.thumbnail = this.goBack.pages;
                        this.goBack.pages = [];
                        this.#previewing = false;
                    } else {
                        const view = interaction.values.includes('info') ? 'info' : 'thumbnail';
                        const galleryID = this.pages[view][0]?.galleryID;
                        if (galleryID && +galleryID < 0) {
                            const loaded = await this.loadGalleryPages(Math.abs(+galleryID));
                            if (loaded.length) this.pages[view] = loaded;
                        }
                        this.#currentView = view;
                    }
                    await this.update(interaction);
                    return false;
                }

                // Browse Gallery — enter preview mode
                if (interaction.values.includes('preview')) {
                    const currentPages = this.pages[this.#currentView][this.#currentPage]?.pages;
                    if (!currentPages?.length) return false;
                    const firstID = currentPages[0].galleryID;
                    if (firstID && +firstID < 0) {
                        const loaded = await this.loadGalleryPages(Math.abs(+firstID));
                        if (loaded.length) {
                            this.pages[this.#currentView][this.#currentPage].pages = loaded;
                        } else {
                            await this.update(interaction);
                            await interaction.followUp({
                                content: 'Failed to load preview pages. Please try again.',
                                flags: MessageFlags.Ephemeral,
                            } as any).catch(() => null);
                            return false;
                        }
                    }
                    this.goBack = {
                        previousView: this.#currentView,
                        previousPage: this.#currentPage,
                        pages: [...this.pages.thumbnail],
                    };
                    this.pages.thumbnail = this.pages[this.#currentView][this.#currentPage].pages as any;
                    this.#currentView = 'thumbnail';
                    this.#currentPage = 0;
                    this.#previewing = true;
                    await this.update(interaction);
                    return false;
                }

                this.#currentView = 'thumbnail';
                await this.update(interaction);
                return false;
            },
        ],
        [
            Interactions.Love,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                try {
                    // Use the page's galleryID, not this.info.id (which may be a tag ID in search/tag context)
                    const id = this.pages[this.#currentView][this.#currentPage]?.galleryID;
                    if (!id) return false;
                    const adding = await this.client.db.user.favorite(
                        interaction.user.id,
                        Math.abs(+id).toString()
                    );
                    await interaction.followUp({
                        content: adding
                            ? `✅\u2000Added \`${Math.abs(+id)}\` to your favorites`
                            : `❌\u2000Removed \`${Math.abs(+id)}\` from your favorites`,
                        flags: MessageFlags.Ephemeral,
                    } as any);
                    return false;
                } catch (err) {
                    this.client.logger.error(err as any);
                    this.interaction.followUp({
                        embeds: [this.client.embeds.internalError(err as any)],
                        flags: MessageFlags.Ephemeral,
                    } as any);
                    return true;
                }
            },
        ],
        [
            Interactions.Follow,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                try {
                    const info = { ...this.info, type: this.interaction.commandName } as any;
                    const { type, name } = info;
                    const id = parseInt(info.id, 10);
                    if (isNaN(id)) return false;
                    const adding = await this.client.db.user.follow(
                        interaction.user.id,
                        type,
                        id,
                        name
                    );
                    await interaction.followUp({
                        content: adding
                            ? `✅\u2000Started following ${type} \`${name}\``
                            : `❌\u2000Stopped following ${type} \`${name}\``,
                        flags: MessageFlags.Ephemeral,
                    } as any);
                    return false;
                } catch (err) {
                    this.client.logger.error(err as any);
                    this.interaction.followUp({
                        embeds: [this.client.embeds.internalError(err as any)],
                        flags: MessageFlags.Ephemeral,
                    } as any);
                    return true;
                }
            },
        ],
        [
            Interactions.Blacklist,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                try {
                    const info = { ...this.info, type: this.interaction.commandName } as any;
                    const { type, name } = info;
                    const id = parseInt(info.id, 10);
                    if (isNaN(id)) return false;
                    const adding = await this.client.db.user.blacklist(
                        interaction.user.id,
                        info as any
                    );
                    await interaction.followUp({
                        content: adding
                            ? `✅\u2000Added ${type} ${name} to your blacklist`
                            : `❌\u2000Removed ${type} ${name} from your blacklist`,
                        flags: MessageFlags.Ephemeral,
                    } as any);
                    return false;
                } catch (err) {
                    this.client.logger.error(err as any);
                    this.interaction.followUp({
                        embeds: [this.client.embeds.internalError(err as any)],
                        flags: MessageFlags.Ephemeral,
                    } as any);
                    return true;
                }
            },
        ],
        [
            Interactions.Filter,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (interaction.user !== this.interaction.user) return false;
                this.pages = { ...this.filteredPages };
                this.filterIDs = [];
                await this.update(interaction);
                return false;
            },
        ],
        [
            Interactions.Remove,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return false;
                if ((interaction.message as Message).deletable) {
                    this.collector.stop('Aborted');
                    await (interaction.message as Message).delete();
                    return true;
                }
                return false;
            },
        ],
        [
            Interactions.Enqueue,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (
                    this.priorityUser
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return false;
                return this.choose(this.#currentPage);
            },
        ],
    ] as any);
}
