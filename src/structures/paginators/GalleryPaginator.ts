import { BasePaginator, BasePaginatorOptions } from './BasePaginator';
import { Client, Command } from '@structures';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	ContextMenuCommandInteraction,
	EmbedBuilder,
	Message,
	MessageComponentInteraction,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
	ThreadChannel,
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
	Select = 'select',
	Love = 'love',
	Follow = 'follow',
	Blacklist = 'blacklist',
	Filter = 'filter',
	Remove = 'remove',
}

export type Views = 'info' | 'thumbnail';

export interface Info {
	id: string;
	name: string;
	type?: string;
}

export interface GalleryPage {
	galleryID?: Gallery['id'] | string;
	embed: EmbedBuilder;
	pages?: GalleryPage[];
}

export interface GalleryPaginatorOptions extends BasePaginatorOptions {
	info?: Info;
	startView?: Views;
	gallery?: Gallery;
	filterIDs?: number[];
	loader?: (id: number) => Promise<GalleryPage[]>;
	galleryActions?: ('love' | 'follow' | 'blacklist' | 'remove')[];
	allowPreview?: boolean;
}

export class GalleryPaginator extends BasePaginator {
	protected views: Record<Views, GalleryPage[]> = { info: [], thumbnail: [] };
	protected filteredViews: Record<Views, GalleryPage[]> = { info: [], thumbnail: [] };
	protected gallery: Gallery | undefined;
	protected info: Info;
	protected filterIDs: number[] = [];
	protected galleryActions: ('love' | 'follow' | 'blacklist' | 'remove')[];
	protected allowPreview: boolean;
	protected goBack: { previousView: Views; previousPage: number; pages: GalleryPage[] } = {
		previousView: 'info',
		previousPage: 0,
		pages: [],
	};

	#currentView: Views;
	#currentPage: number;
	#previewing = false;

	constructor(client: Client, options: GalleryPaginatorOptions = {}) {
		super(client, {
			startPage: options.startPage ?? 0,
			collectorTimeout: options.collectorTimeout,
			jumpTimeout: options.jumpTimeout,
			prompt: options.prompt,
			dispose: options.dispose,
			priorityUser: options.priorityUser,
			filter: options.filter,
			onBoundary: options.onBoundary,
		});
		this.info = options.info ?? { id: '', name: '' };
		this.filterIDs = options.filterIDs ?? [];
		this.gallery = options.gallery;
		this.#currentView = options.startView ?? (options.startPage && options.startPage > 0 ? 'thumbnail' : 'info');
		this.#currentPage = options.startPage ?? 0;
		this.galleryActions = options.galleryActions ?? ['love', 'remove'];
		this.allowPreview = options.allowPreview ?? false;
	}

	addPage(view: Views, page: GalleryPage | GalleryPage[]) {
		this.views[view] = this.views[view].concat(page as any);
		return this;
	}

	protected getCurrentPage(): GalleryPage | undefined {
		return this.views[this.#currentView][this.#currentPage];
	}

	protected override getCurrentEmbed(): EmbedBuilder {
		return this.getCurrentPage()?.embed ?? this.views[this.#currentView][0]?.embed;
	}

	protected override getPageCount(): number {
		return this.views[this.#currentView].length;
	}

	protected getCurrentPagesLength(): number {
		return this.views[this.#currentView].length;
	}

	protected override getNavigationRow(): ActionRowBuilder<ButtonBuilder> {
		const current = this.#currentPage + 1;
		const total = this.getCurrentPagesLength();
		return new ActionRowBuilder<ButtonBuilder>().addComponents([
			this.makeButton('first', '<<', ButtonStyle.Secondary),
			this.makeButton('back', '<', ButtonStyle.Secondary),
			this.makeButton('jump', `${current} of ${total}`, ButtonStyle.Secondary),
			this.makeButton('forward', '>', ButtonStyle.Secondary),
			this.makeButton('last', '>>', ButtonStyle.Secondary),
		]);
	}

	protected buildSelectOptions(): StringSelectMenuOptionBuilder[] {
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
		}
		else {
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
			if (this.allowPreview) {
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

	protected override getButtons(): ActionRowBuilder<any>[] {
		const id = this.views[this.#currentView][this.#currentPage]?.galleryID ?? this.info.id;
		const naviRow = this.getNavigationRow();

		if (this.#previewing) {
			const previewOptionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				['love', 'remove'].map(k =>
					this.makeButton(k, k === 'love' ? '❤️' : '🗑️', k === 'remove' ? ButtonStyle.Danger : ButtonStyle.Secondary)
				)
			);
			return [
				naviRow,
				previewOptionsRow,
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(`${this.id} select`)
						.addOptions(this.buildSelectOptions())
				),
			];
		}

		const optionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			this.galleryActions.map(k => {
				const labels: Record<string, string> = {
					love: '❤️',
					follow: '🔖',
					blacklist: '🏴',
					remove: '🗑️',
				};
				return this.makeButton(k, labels[k] ?? k, k === 'remove' ? ButtonStyle.Danger : ButtonStyle.Secondary);
			})
		);

		const channel = this.interaction.channel as TextChannel | ThreadChannel | null;
		try {
			if (
				!channel?.permissionsFor(this.interaction.guild!.members.me!)?.has(PermissionFlagsBits.ManageMessages) ||
				!channel?.permissionsFor(this.interaction.guild!.members.me!)?.has(PermissionFlagsBits.ViewChannel) ||
				!channel?.permissionsFor(this.interaction.guild!.members.me!)?.has(PermissionFlagsBits.ReadMessageHistory)
			) {
				const comps = optionsRow.components;
				comps.splice(-1, 1);
				optionsRow.setComponents(comps as any);
			}
		}
		catch {
			// ignore permission check failures
		}

		const rows: ActionRowBuilder<any>[] = [];
		if (this.getCurrentPagesLength() > 1) rows.push(naviRow);
		if ((optionsRow.components as any[]).length) rows.push(optionsRow as any);
		if (this.filterIDs.length && !this.#previewing) {
			rows.push(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(`${this.id} filter`)
						.setLabel(`👁️\u00A0\u00A0Click here to see ${this.filterIDs.length} filtered galleries`)
						.setStyle(ButtonStyle.Secondary)
				) as any
			);
		}
		if (this.views.thumbnail.length && this.views.info.length) {
			rows.push(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(`${this.id} select`)
						.addOptions(this.buildSelectOptions())
				) as any
			);
		}
		return rows;
	}

	protected async loadGalleryPages(id: number): Promise<GalleryPage[]> {
		if (this.gallery) {
			return this.client.embeds.getPages(this.gallery) as GalleryPage[];
		}
		try {
			const g = await this.client.nhentai.g(Math.abs(id));
			return this.client.embeds.getPages(g.gallery) as GalleryPage[];
		}
		catch (err: any) {
			this.client.logger.warn('loadGalleryPages: nhentai.g failed, trying cache', err.message);
			const doujin = await this.client.db.cache.getDoujin(Math.abs(id)).catch(err => {
				this.client.logger.warn('loadGalleryPages: MariaDB cache miss for', id, err.message);
				return null;
			});
			return this.client.embeds.getEduGuessPages(doujin as any) as GalleryPage[];
		}
	}

	override async run(
		interaction: CommandInteraction | ContextMenuCommandInteraction,
		content = '',
		type: 'followUp' | 'reply' | 'editReply' = 'editReply'
	) {
		if (!interaction.guild) throw new Error('Paginator cannot be used in DMs');
		this.interaction = interaction;

		if (this.filterIDs.length) {
			this.filteredViews = { ...this.views };
			this.views = {
				info: this.views.info.filter(page => !this.filterIDs.includes(+page.galleryID!)),
				thumbnail: this.views.thumbnail.filter(page => !this.filterIDs.includes(+page.galleryID!)),
			};
		}

		return super.run(interaction, content, type);
	}

	protected override registerHandlers() {
		super.registerHandlers();
		this.handlers.set('select', this.handleSelect.bind(this));
		this.handlers.set('love', this.handleLove.bind(this));
		this.handlers.set('follow', this.handleFollow.bind(this));
		this.handlers.set('blacklist', this.handleBlacklist.bind(this));
		this.handlers.set('filter', this.handleFilter.bind(this));
	}

	protected override async handleFirst(interaction: MessageComponentInteraction): Promise<boolean> {
		if (this.priorityUser ? this.priorityUser.id !== interaction.user.id : interaction.user.id !== this.interaction.user.id)
			return false;
		if (this.#currentPage === 0) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'prev');
			}
			return false;
		}
		this.#currentPage = 0;
		await this.update(interaction);
		return false;
	}

	protected override async handleBack(interaction: MessageComponentInteraction): Promise<boolean> {
		if (this.priorityUser ? this.priorityUser.id !== interaction.user.id : interaction.user.id !== this.interaction.user.id)
			return false;
		if (this.#currentPage <= 0) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'prev');
			}
			return false;
		}
		this.#currentPage--;
		await this.update(interaction);
		return false;
	}

	protected override async handleForward(interaction: MessageComponentInteraction): Promise<boolean> {
		if (this.priorityUser ? this.priorityUser.id !== interaction.user.id : interaction.user.id !== this.interaction.user.id)
			return false;
		if (this.#currentPage >= this.getCurrentPagesLength() - 1) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'next');
			}
			return false;
		}
		this.#currentPage++;
		await this.update(interaction);
		return false;
	}

	protected override async handleLast(interaction: MessageComponentInteraction): Promise<boolean> {
		if (this.priorityUser ? this.priorityUser.id !== interaction.user.id : interaction.user.id !== this.interaction.user.id)
			return false;
		if (this.#currentPage === this.getCurrentPagesLength() - 1) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'next');
			}
			return false;
		}
		this.#currentPage = this.getCurrentPagesLength() - 1;
		await this.update(interaction);
		return false;
	}

	protected async handleSelect(interaction: MessageComponentInteraction): Promise<boolean> {
		if (interaction.user !== this.interaction.user || !interaction.isStringSelectMenu()) return false;
		if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
		await interaction.editReply({ components: this.getDisabledComponents() } as any).catch(() => null);

		if (interaction.values.includes('info') || interaction.values.includes('thumbnail')) {
			if (this.#previewing) {
				if (!this.goBack.pages.length) return false;
				this.#currentView = interaction.values.includes('info') ? 'info' : 'thumbnail';
				this.#currentPage = this.goBack.previousPage;
				this.views.thumbnail = this.goBack.pages as any;
				this.goBack.pages = [];
				this.#previewing = false;
			}
			else {
				const view = interaction.values.includes('info') ? 'info' : 'thumbnail';
				const galleryID = this.views[view][0]?.galleryID;
				if (galleryID && +galleryID < 0) {
					const loaded = await this.loadGalleryPages(Math.abs(+galleryID));
					if (loaded.length) this.views[view] = loaded;
				}
				this.#currentView = view;
			}
			await this.update(interaction);
			return false;
		}

		if (interaction.values.includes('preview')) {
			const currentPages = this.views[this.#currentView][this.#currentPage]?.pages;
			if (!currentPages?.length) return false;
			const firstID = currentPages[0].galleryID;
			if (firstID && +firstID < 0) {
				const loaded = await this.loadGalleryPages(Math.abs(+firstID));
				if (loaded.length) {
					this.views[this.#currentView][this.#currentPage].pages = loaded;
				}
				else {
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
				pages: [...this.views.thumbnail],
			};
			this.views.thumbnail = this.views[this.#currentView][this.#currentPage].pages as any;
			this.#currentView = 'thumbnail';
			this.#currentPage = 0;
			this.#previewing = true;
			await this.update(interaction);
			return false;
		}

		this.#currentView = 'thumbnail';
		await this.update(interaction);
		return false;
	}

	protected async handleLove(interaction: MessageComponentInteraction): Promise<boolean> {
		try {
			const id = this.views[this.#currentView][this.#currentPage]?.galleryID;
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
		}
		catch (err) {
			this.client.logger.error(err as any);
			this.interaction.followUp({
				embeds: [this.client.embeds.internalError(err as any)],
				flags: MessageFlags.Ephemeral,
			} as any);
			return true;
		}
	}

	protected async handleFollow(interaction: MessageComponentInteraction): Promise<boolean> {
		try {
			const info = { ...this.info } as any;
			const { type, name } = info;
			const id = parseInt(info.id, 10);
			if (!type || isNaN(id)) return false;
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
		}
		catch (err) {
			this.client.logger.error(err as any);
			this.interaction.followUp({
				embeds: [this.client.embeds.internalError(err as any)],
				flags: MessageFlags.Ephemeral,
			} as any);
			return true;
		}
	}

	protected async handleBlacklist(interaction: MessageComponentInteraction): Promise<boolean> {
		try {
			const info = { ...this.info } as any;
			const { type, name } = info;
			const id = parseInt(info.id, 10);
			if (!type || isNaN(id)) return false;
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
		}
		catch (err) {
			this.client.logger.error(err as any);
			this.interaction.followUp({
				embeds: [this.client.embeds.internalError(err as any)],
				flags: MessageFlags.Ephemeral,
			} as any);
			return true;
		}
	}

	protected async handleFilter(interaction: MessageComponentInteraction): Promise<boolean> {
		if (interaction.user !== this.interaction.user) return false;
		this.views = { ...this.filteredViews };
		this.filterIDs = [];
		await this.update(interaction);
		return false;
	}

}
