import { Client, Command } from '@structures';
import {
    Collection,
    CollectorFilter,
    CommandInteraction,
    ContextMenuInteraction,
    InteractionCollector,
    InteractionCollectorOptions,
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
    MessageSelectMenu,
    MessageSelectOptionData,
    Modal,
    ModalActionRowComponent,
    Snowflake,
    SnowflakeUtil,
    TextChannel,
    TextInputComponent,
    User,
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
    Return = 'return',
    Select = 'select',
    Love = 'love',
    Follow = 'follow',
    Blacklist = 'blacklist',
    Filter = 'filter',
    Download = 'download',
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
    embed: MessageEmbed;
    pages?: Page[];
}

export interface PaginatorOptions extends InteractionCollectorOptions<MessageComponentInteraction> {
    info?: Info;
    filter?: CollectorFilter<[MessageComponentInteraction]>;
    startView?: Views;
    startPage?: number;
    commandPage?: number;
    image?: string;
    prompt?: string;
    jumpTimeout?: number;
    collectorTimeout?: number;
    priorityUser?: User;
    filterIDs?: number[];
}

const TAGS = ['tag', 'artist', 'character', 'category', 'group', 'parody', 'language'];

export class Paginator {
    readonly client: Client;
    private readonly id: Snowflake;
    interaction: CommandInteraction | ContextMenuInteraction;
    collector: InteractionCollector<MessageComponentInteraction>;
    pages: Record<Views, Page[]>;
    filteredPages: Record<Views, Page[]>;
    private followedUp: boolean;
    selection: Promise<number | null>;
    private goBack: { previousView: 'info' | 'thumbnail'; previousPage: number; pages: Page[] };
    private readonly methodMap: Collection<Interactions, MessageButton | MessageSelectMenu>;
    private readonly priorityUser: User | null;
    private filterIDs: number[];
    private readonly info: Info;
    private readonly filter: CollectorFilter<[MessageComponentInteraction]>;
    private image: string | null;
    private ephemeral: boolean;
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

    constructor(client: Client, options: PaginatorOptions) {
        this.client = client;
        this.id = SnowflakeUtil.generate();
        this.client.paginators.set(this.id, this);
        this.pages = { info: [], thumbnail: [] };
        this.filteredPages = { info: [], thumbnail: [] };
        this.followedUp = false;
        this.methodMap = new Collection<Interactions, MessageButton | MessageSelectMenu>();
        this.priorityUser = options.priorityUser;
        this.filterIDs = options.filterIDs ?? [];
        this.info = options.info ?? { id: '', name: '' };
        this.filter = options.filter ?? (() => true);
        this.image = options.image;
        this.ephemeral = false;
        this.prompt = options.prompt ?? 'Which page would you like to jump to?';
        this.dispose = options.dispose ?? false;
        this.jumpTimeout = options.jumpTimeout ?? 30000;
        this.collectorTimeout = options.collectorTimeout ?? 900000;
        this.currentCommandPage = options.commandPage ?? 1;
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
                new MessageButton()
                    .setCustomId(this.id + ' first')
                    .setLabel('<<')
                    .setStyle('SECONDARY')
            )
            .set(
                Interactions.Back,
                new MessageButton()
                    .setCustomId(this.id + ' back')
                    .setLabel('<')
                    .setStyle('SECONDARY')
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
                new MessageButton()
                    .setCustomId(this.id + ' forward')
                    .setLabel('>')
                    .setStyle('SECONDARY')
            )
            .set(
                Interactions.Last,
                new MessageButton()
                    .setCustomId(this.id + ' last')
                    .setLabel('>>')
                    .setStyle('SECONDARY')
            )
            .set(
                Interactions.Info,
                new MessageButton()
                    .setCustomId(this.id + ' info')
                    .setLabel('Sauce?')
                    .setStyle('PRIMARY')
            )
            .set(
                Interactions.Select,
                new MessageSelectMenu().setCustomId(this.id + ' select').addOptions([
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
                Interactions.Love,
                new MessageButton()
                    .setCustomId(this.id + ' love')
                    .setLabel('❤️')
                    .setStyle('SECONDARY')
            )
            .set(
                Interactions.Follow,
                new MessageButton()
                    .setCustomId(this.id + ' follow')
                    .setLabel('🔖')
                    .setStyle('SECONDARY')
            )
            .set(
                Interactions.Blacklist,
                new MessageButton()
                    .setCustomId(this.id + ' blacklist')
                    .setLabel('🏴')
                    .setStyle('SECONDARY')
            )
            .set(
                Interactions.Filter,
                new MessageButton()
                    .setCustomId(this.id + ' filter')
                    .setLabel(`Click here to see ${this.filterIDs.length} filtered galleries`)
                    .setEmoji('👁️')
                    .setStyle('SECONDARY')
            )
            // .set(
            //     Interactions.Download,
            //     new MessageButton()
            //         .setLabel('📥')
            //         .setStyle('LINK')
            //         .setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
            // )
            .set(
                Interactions.Remove,
                new MessageButton()
                    .setCustomId(this.id + ' remove')
                    .setLabel('🗑️')
                    .setStyle('DANGER')
            )
            .set(
                Interactions.Enqueue,
                new MessageButton()
                    .setCustomId(this.id + ' enqueue')
                    .setLabel('⏯️\u2000Enqueue this track to the playlist')
                    .setStyle('PRIMARY')
            );
    }

    private getButtons() {
        const id = this.pages[this.#currentView][this.#currentPage]?.galleryID ?? this.info.id;
        // let downloadURL = `https://d.nope.ovh/download/${id}`;
        // if (!id) downloadURL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        // (this.methodMap.get(Interactions.Download) as MessageButton).setURL(downloadURL);
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
            TAGS.includes(this.interaction.commandName)
                ? [
                      this.methodMap.get(Interactions.Love),
                      this.methodMap.get(Interactions.Follow),
                      this.methodMap.get(Interactions.Blacklist),
                      //   this.methodMap.get(Interactions.Download),
                      this.methodMap.get(Interactions.Remove),
                  ]
                : ['home', 'search', 'g', 'random', 'favorite'].includes(
                      this.interaction.commandName
                  )
                ? [
                      this.methodMap.get(Interactions.Love),
                      //   this.methodMap.get(Interactions.Download),
                      this.methodMap.get(Interactions.Remove),
                  ]
                : ['play'].includes(this.interaction.commandName)
                ? [
                      this.methodMap.get(Interactions.Enqueue),
                      this.methodMap.get(Interactions.Remove),
                  ]
                : [this.methodMap.get(Interactions.Remove)]
        );
        if (
            this.ephemeral ||
            !(this.interaction.channel as TextChannel)
                .permissionsFor(this.interaction.guild.members.me)
                .has('MANAGE_MESSAGES') ||
            !(this.interaction.channel as TextChannel)
                .permissionsFor(this.interaction.guild.members.me)
                .has('VIEW_CHANNEL') ||
            !(this.interaction.channel as TextChannel)
                .permissionsFor(this.interaction.guild.members.me)
                .has('READ_MESSAGE_HISTORY')
        )
            optionsRow.spliceComponents(-1, 1);
        if (
            this.image &&
            this.interaction.commandName !== 'sauce' &&
            this.interaction.commandName !== 'saucenao' &&
            !this.priorityUser
        ) {
            return [
                new MessageActionRow().addComponents(
                    this.ephemeral
                        ? [this.methodMap.get(Interactions.Info)]
                        : [
                              this.methodMap.get(Interactions.Info),
                              this.methodMap.get(Interactions.Remove),
                          ]
                ),
            ];
        }
        if (
            this.interaction.commandName === 'sauce' ||
            this.interaction.commandName === 'saucenao' ||
            (this.image && this.priorityUser)
        ) {
            const imageURL = this.image;
            const googleURL = `https://lens.google.com/uploadbyurl?url=${imageURL}&safe=off`,
                tineyeURL = `https://tineye.com/search/?url=${imageURL}`,
                ascii2dURL = `https://ascii2d.net/search/url/${imageURL}`,
                yandexURL = `https://yandex.com/images/search?url=${imageURL}&rpt=imageview`;
            const others = [
                new MessageButton().setLabel('Google Lens').setStyle('LINK').setURL(googleURL),
                new MessageButton().setLabel('TinEye').setStyle('LINK').setURL(tineyeURL),
                new MessageButton().setLabel('ascii2d').setStyle('LINK').setURL(ascii2dURL),
                // new MessageButton().setLabel('Yandex').setStyle('LINK').setURL(yandexURL),
                this.methodMap.get(Interactions.Remove),
            ];
            return [
                naviRow,
                new MessageActionRow().addComponents(
                    this.ephemeral ? others.splice(0, others.length - 1) : others
                ),
            ];
        }
        const rows = [];
        if (this.pages[this.#currentView].length > 1) rows.push(naviRow);
        if (optionsRow.components.length) rows.push(optionsRow);
        if (this.filterIDs.length && !this.#previewing)
            rows.push(
                new MessageActionRow().addComponents(this.methodMap.get(Interactions.Filter))
            );
        if (this.pages.thumbnail.length && this.pages.info.length)
            rows.push(
                new MessageActionRow().addComponents(this.methodMap.get(Interactions.Select))
            );
        return rows;
    }

    private async update(interaction: MessageComponentInteraction): Promise<boolean> {
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
        });
        return false;
    }

    addPage(view: Views, page: Page | Page[]) {
        this.pages[view] = this.pages[view].concat(page);
        return this;
    }

    async run(
        interaction: CommandInteraction | ContextMenuInteraction,
        content = '',
        type: 'followUp' | 'reply' | 'editReply' = 'editReply'
    ) {
        if (!interaction.guild) {
            throw new Error(
                'Paginator cannot be used in DMs, as they do not have enough permissions to perform in a UX friendly way.'
            );
        }
        this.interaction = interaction;
        this.selection =
            this.interaction.commandName === 'play'
                ? new Promise(resolve => {
                      this.#resolve = resolve;
                  })
                : Promise.resolve(null);
        this.followedUp = type === 'followUp';
        this.#currentView = ['g', 'random', 'favorite'].includes(this.interaction.commandName)
            ? this.#currentPage > 0
                ? 'thumbnail'
                : 'info'
            : 'thumbnail';
        if (this.filterIDs.length) {
            this.filteredPages = Object.assign({}, this.pages);
            this.pages = {
                info: this.pages.info.filter(page => !this.filterIDs.includes(+page.galleryID)),
                thumbnail: this.pages.thumbnail.filter(
                    page => !this.filterIDs.includes(+page.galleryID)
                ),
            };
        }
        this.ephemeral = (interaction.options.get('private')?.value as boolean) ?? false;
        const c = {
            content: content.length ? content : null,
            embeds: this.pages[this.#currentView].length
                ? [this.pages[this.#currentView][this.#currentPage].embed]
                : [],
            components: this.getButtons(),
            ephemeral: this.ephemeral,
            allowedMentions: { repliedUser: false },
        };
        const message = (await this.interaction[type](c)) as Message;
        this.collector = message.createMessageComponentCollector({
            filter: this.filter,
            idle: this.collectorTimeout,
            dispose: this.dispose,
        });
        this.collector.on('collect', async interaction => {
            if (interaction.user.bot) return;
            let method = interaction.customId;
            if (!method.startsWith(this.id)) return;
            method = method.slice(this.id.length + 1);
            if (!this.methodMap.has(method as Interactions)) return;
            if (method !== Interactions.Jump && !interaction.deferred && !interaction.replied)
                await interaction.deferUpdate();
            const rip = await this.methods.get(method as Interactions)?.call(this, interaction);
            if (rip) this.collector.stop();
        });
        this.collector.on('end', () => {
            this.client.paginators.delete(this.id);
        });
        return message;
    }

    private choose(value: number): Promise<boolean> {
        this.#resolve!(value);
        this.collector.stop('Chosen');
        return Promise.resolve(true);
    }

    private async turnPage(interaction: MessageComponentInteraction): Promise<void> {
        this.methodMap.forEach((v, k) => this.methodMap.get(k).setDisabled(!v.disabled));
        await this.update(interaction);
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
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage === 0) {
                    if (['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)) {
                        if (this.currentCommandPage === 1) return Promise.resolve(false);
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return Promise.resolve(false);
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.turnPage(interaction);
                        }
                        try {
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage - 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.turnPage(interaction);
                        } finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage = 0;
                return await this.update(interaction);
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
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage <= 0) {
                    if (['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)) {
                        if (this.currentCommandPage === 1) return Promise.resolve(false);
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return Promise.resolve(false);
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.turnPage(interaction);
                        }
                        try {
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage - 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.turnPage(interaction);
                        } finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage--;
                return await this.update(interaction);
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
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage >= this.pages[this.#currentView].length - 1) {
                    if (['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)) {
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return Promise.resolve(false);
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.turnPage(interaction);
                        }
                        try {
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage + 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.turnPage(interaction);
                        } finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage++;
                return await this.update(interaction);
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
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if (this.#currentPage === this.pages[this.#currentView].length - 1) {
                    if (['home', 'search', ...TAGS, 'booru'].includes(this.interaction.commandName)) {
                        if (
                            this.interaction.commandName === 'home' &&
                            this.currentCommandPage == 1
                        ) {
                            if (!this.followedUp) return Promise.resolve(false);
                            else await (interaction.message as Message).delete();
                        } else {
                            await this.turnPage(interaction);
                        }
                        try {
                            await (
                                this.client.commands.get(this.interaction.commandName) as Command
                            ).run(
                                this.interaction as CommandInteraction,
                                this.currentCommandPage + 1,
                                true
                            );
                            this.collector.stop('Aborted');
                        } catch (err) {
                            await this.turnPage(interaction);
                        } finally {
                            return Promise.resolve(false);
                        }
                    }
                    return Promise.resolve(false);
                }
                this.#currentPage = this.pages[this.#currentView].length - 1;
                return await this.update(interaction);
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
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                const modal = new Modal().setCustomId(this.id).setTitle(this.client.user.username);
                const pageInput = new TextInputComponent()
                    .setCustomId('pageInput')
                    .setLabel(this.prompt)
                    .setStyle('SHORT')
                    .setRequired(true);
                const firstActionRow =
                    new MessageActionRow<ModalActionRowComponent>().addComponents(pageInput);
                modal.addComponents(firstActionRow);
                await interaction.showModal(modal);
                const response = await interaction.awaitModalSubmit({
                    filter: mint => mint.user === interaction.user,
                    time: 15000,
                    idle: this.jumpTimeout,
                });
                await response.deferUpdate();
                let newPage = parseInt(response.fields.getTextInputValue('pageInput'));
                if (
                    newPage &&
                    !isNaN(newPage) &&
                    newPage > 0 &&
                    newPage <= this.pages[this.#currentView].length
                ) {
                    this.#currentPage = newPage - 1;
                    return await this.update(interaction);
                }
                return Promise.resolve(false);
            }
        )
        .set(
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
                    return Promise.resolve(false);

                await (this.client.commands.get('sauce') as Command).run(
                    this.interaction as CommandInteraction,
                    (await this.interaction.fetchReply() as Message).embeds[0].image.url, // this.image,
                    {
                        external: true,
                        user: interaction.user,
                    }
                );
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
                let id = 0;
                if ((id = +this.pages.info[0].galleryID) < 0) {
                    this.pages.info = await this.client.nhentai
                        .g(Math.abs(id))
                        .then(g => this.client.embeds.getPages(g.gallery));
                }
                if ((id = +this.pages.thumbnail[0].galleryID) < 0) {
                    this.pages.thumbnail = await this.client.nhentai
                        .g(Math.abs(id))
                        .then(g => this.client.embeds.getPages(g.gallery));
                }
                if (interaction.values.includes('preview')) {
                    if (!this.pages[this.#currentView][this.#currentPage].pages) {
                        return Promise.resolve(false);
                    }
                    if (
                        (id =
                            +this.pages[this.#currentView][this.#currentPage].pages[0].galleryID) <
                        0
                    ) {
                        this.pages[this.#currentView][this.#currentPage].pages =
                            await this.client.nhentai
                                .g(Math.abs(id))
                                .then(g => this.client.embeds.getPages(g.gallery));
                    }
                    this.goBack = {
                        previousView: this.#currentView,
                        previousPage: this.#currentPage,
                        pages: this.pages.thumbnail,
                    };
                    this.pages.thumbnail = this.pages[this.#currentView][this.#currentPage].pages;
                    this.#currentView = 'thumbnail';
                    this.#currentPage = 0;
                    this.#previewing = true;
                    return await this.update(interaction);
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
                    return await this.update(interaction);
                }
                this.#currentView = interaction.values.includes('info') ? 'info' : 'thumbnail';
                return await this.update(interaction);
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
                    await interaction.followUp({
                        content: adding
                            ? `✅\u2000Added \`${id}\` to your favorites`
                            : `❌\u2000Removed \`${id}\` from your favorites`,
                        ephemeral: true,
                    });
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
                    await interaction.followUp({
                        content: adding
                            ? `✅\u2000Started following ${type} \`${name}\``
                            : `❌\u2000Stopped following ${type} \`${name}\``,
                        ephemeral: true,
                    });
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
                    await interaction.followUp({
                        content: adding
                            ? `✅\u2000Added ${type} ${name} to your blacklist`
                            : `❌\u2000Removed ${type} ${name} from your blacklist`,
                        ephemeral: true,
                    });
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
            Interactions.Filter,
            async function (
                this: Paginator,
                interaction: MessageComponentInteraction
            ): Promise<boolean> {
                if (interaction.user !== this.interaction.user) return Promise.resolve(false);
                this.pages = this.filteredPages;
                this.filterIDs = [];
                return await this.update(interaction);
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
                        ? this.priorityUser.id !== interaction.user.id
                        : interaction.user.id !== this.interaction.user.id
                )
                    return Promise.resolve(false);
                if ((interaction.message as Message).deletable) {
                    this.collector.stop('Aborted');
                    await (interaction.message as Message).delete();
                    return true;
                }
                /* if ((interaction.message as Message).reference) {
                    const message = await (interaction.message as Message).fetchReference();
                    if (message?.deletable) await message.delete();
                } */ // delete reference message
                return Promise.resolve(false);
            }
        )
        .set(
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
                    return Promise.resolve(false);
                return this.choose(this.#currentPage);
            }
        );
}
