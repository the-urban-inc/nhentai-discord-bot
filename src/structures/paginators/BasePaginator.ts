import { Client } from '@structures';
import {
	ActionRowBuilder,
	AnySelectMenuInteraction,
	ButtonBuilder,
	ButtonStyle,
	CollectedInteraction,
	CommandInteraction,
	ComponentType,
	ContextMenuCommandInteraction,
	EmbedBuilder,
	InteractionCollector,
	Message,
	MessageComponentInteraction,
	MessageFlags,
	ModalBuilder,
	ModalSubmitInteraction,
	PermissionFlagsBits,
	SnowflakeUtil,
	StringSelectMenuBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
	ThreadChannel,
	User,
} from 'discord.js';

export interface BasePage {
	embed: EmbedBuilder;
	[key: string]: any;
}

export interface ActionButton {
	id: string;
	label: string;
	emoji?: string;
	style: ButtonStyle;
	url?: string;
	handler?: (interaction: MessageComponentInteraction, paginator: BasePaginator) => Promise<boolean>;
}

export interface BasePaginatorOptions {
	startPage?: number;
	collectorTimeout?: number;
	jumpTimeout?: number;
	prompt?: string;
	dispose?: boolean;
	priorityUser?: User;
	filter?: (interaction: MessageComponentInteraction) => boolean;
	actions?: ActionButton[];
	onBoundary?: (direction: 'prev' | 'next', interaction: MessageComponentInteraction) => Promise<void>;
	resolveOn?: string;
	image?: string;
}

const DEFAULT_JUMP_TIMEOUT = 30_000;
const DEFAULT_COLLECTOR_TIMEOUT = 900_000;

export class BasePaginator {
	readonly client: Client;
	readonly id: bigint;
	protected interaction!: CommandInteraction | ContextMenuCommandInteraction;
	protected collector!: InteractionCollector<CollectedInteraction>;
	protected pages: BasePage[] = [];
	protected followedUp = false;
	selection: Promise<number | null> = Promise.resolve(null);
	ended = false;

	protected priorityUser: User | null;
	protected filter: (interaction: MessageComponentInteraction) => boolean;
	protected actions: ActionButton[];
	protected onBoundary?: (direction: 'prev' | 'next', interaction: MessageComponentInteraction) => Promise<void>;
	protected resolveOn?: string;
	protected prompt: string;
	protected dispose: boolean;
	protected jumpTimeout: number;
	protected collectorTimeout: number;
	image: string | null;

	protected currentPage: number;
	#resolve: ((value: number | null) => void) | null = null;

	constructor(client: Client, options: BasePaginatorOptions = {}) {
		this.client = client;
		this.id = SnowflakeUtil.generate();
		this.client.paginators.set(this.id, this);
		this.priorityUser = options.priorityUser ?? null;
		this.filter = options.filter ?? (() => true);
		this.actions = options.actions ?? [];
		this.onBoundary = options.onBoundary;
		this.resolveOn = options.resolveOn;
		this.prompt = options.prompt ?? 'Which page would you like to jump to?';
		this.dispose = options.dispose ?? false;
		this.jumpTimeout = options.jumpTimeout ?? DEFAULT_JUMP_TIMEOUT;
		this.collectorTimeout = options.collectorTimeout ?? DEFAULT_COLLECTOR_TIMEOUT;
		this.currentPage = options.startPage ?? 0;
		this.registerHandlers();
	}

	addPage(...args: any[]) {
		this.pages = this.pages.concat(args.length > 1 ? args[1] : args[0]);
		return this;
	}

	protected getCurrentEmbed(): EmbedBuilder {
		return this.pages[this.currentPage]?.embed ?? this.pages[0]?.embed;
	}

	protected makeButton(id: string, label: string, style: ButtonStyle = ButtonStyle.Secondary) {
		return new ButtonBuilder().setCustomId(`${this.id} ${id}`).setLabel(label).setStyle(style);
	}

	protected getPageCount(): number {
		return this.pages.length;
	}

	protected getNavigationRow(): ActionRowBuilder<ButtonBuilder> {
		const current = this.currentPage + 1;
		const total = this.getPageCount();
		return new ActionRowBuilder<ButtonBuilder>().addComponents([
			this.makeButton('first', '<<', ButtonStyle.Secondary),
			this.makeButton('back', '<', ButtonStyle.Secondary),
			this.makeButton('jump', `${current} of ${total}`, ButtonStyle.Secondary),
			this.makeButton('forward', '>', ButtonStyle.Secondary),
			this.makeButton('last', '>>', ButtonStyle.Secondary),
		]);
	}

	protected getActionRow(): ActionRowBuilder<ButtonBuilder> {
		const row = new ActionRowBuilder<ButtonBuilder>();
		for (const action of this.actions) {
			const btn = new ButtonBuilder()
				.setCustomId(`${this.id} ${action.id}`)
				.setLabel(action.label)
				.setStyle(action.style);
			if (action.emoji) btn.setEmoji(action.emoji);
			if (action.url) btn.setURL(action.url);
			row.addComponents(btn);
		}
		return row;
	}

	protected getButtons(): ActionRowBuilder<any>[] {
		const rows: ActionRowBuilder<any>[] = [];
		if (this.pages.length > 1) {
			rows.push(this.getNavigationRow());
		}
		const actionRow = this.getActionRow();
		if (actionRow.components.length) {
			rows.push(actionRow);
		}
		return rows;
	}

	protected getLoadingComponents(): ActionRowBuilder<ButtonBuilder>[] {
		return [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`${this.id} loading`)
					.setEmoji({ name: '⏳' })
					.setLabel('Loading…')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(true)
			),
		];
	}

	protected getDisabledComponents(): ActionRowBuilder<any>[] {
		return this.getButtons().map(row => {
			const disabledRow = new ActionRowBuilder<any>();
			for (const component of row.components) {
				const json = component.toJSON();
				if (json.type === ComponentType.Button) {
					disabledRow.addComponents(
						new ButtonBuilder(json as any).setDisabled(true)
					);
				}
				else if (json.type === ComponentType.StringSelect) {
					disabledRow.addComponents(
						new StringSelectMenuBuilder(json as any).setDisabled(true)
					);
				}
				else {
					disabledRow.addComponents(component as any);
				}
			}
			return disabledRow;
		});
	}

	protected async update(
		interaction: MessageComponentInteraction | AnySelectMenuInteraction | ModalSubmitInteraction
	): Promise<void> {
		const message = interaction.message as Message;
		const content = message.content?.length ? message.content : null;
		await (interaction as any)[interaction.deferred || interaction.replied ? 'editReply' : 'update']({
			content,
			embeds: this.getCurrentEmbed() ? [this.getCurrentEmbed()] : [],
			components: this.getButtons(),
		} as any);
	}

	async run(
		interaction: CommandInteraction | ContextMenuCommandInteraction,
		content = '',
		type: 'followUp' | 'reply' | 'editReply' = 'editReply'
	) {
		this.interaction = interaction;
		this.followedUp = type === 'followUp';
		if (this.resolveOn) {
			this.selection = new Promise(resolve => {
				this.#resolve = resolve;
			});
		}

		const payload: any = {
			content: content.length ? content : null,
			embeds: this.getCurrentEmbed() ? [this.getCurrentEmbed()] : [],
			components: this.getButtons(),
			allowedMentions: { repliedUser: false },
		};

		const message = (await this.interaction[type](payload)) as Message;

		this.collector = message.createMessageComponentCollector({
			filter: this.filter as any,
			idle: this.collectorTimeout,
			dispose: this.dispose,
		});

		this.collector.on('collect', async interaction => {
			try {
				if (interaction.user.bot) return;
				const method = this.parseMethod(interaction.customId);
				if (!method) return;
				if (method !== 'jump' && !interaction.deferred && !interaction.replied) await interaction.deferUpdate();
				const handler = this.handlers.get(method);
				if (!handler) return;
				const stop = await handler.call(this, interaction);
				if (stop) this.collector.stop();
			}
			catch (err: any) {
				try {
					this.client.logger.error(err);
					if (interaction && !interaction.deferred && !interaction.replied) {
						await interaction.deferUpdate();
					}
					await interaction.followUp({
						content: 'An internal error occurred while handling this interaction.',
						flags: MessageFlags.Ephemeral,
					} as any).catch(() => null);
				}
				catch {
					// swallow
				}
			}
		});

		this.collector.on('end', () => {
			this.ended = true;
			this.client.paginators.delete(this.id);
		});

		return message;
	}

	protected parseMethod(customId: string): string | null {
		const prefix = this.id.toString();
		if (!customId.startsWith(prefix)) return null;
		return customId.slice(prefix.length + 1);
	}

	protected choose(value: number): boolean {
		this.#resolve?.(value);
		this.collector.stop('Chosen');
		return true;
	}

	checkUser(interaction: MessageComponentInteraction): boolean {
		if (this.priorityUser) {
			return this.priorityUser.id === interaction.user.id;
		}
		return this.interaction.user.id === interaction.user.id;
	}

	protected handlers = new Map<string, (this: BasePaginator, interaction: MessageComponentInteraction) => Promise<boolean>>();

	protected registerHandlers() {
		this.handlers.set('first', this.handleFirst.bind(this));
		this.handlers.set('back', this.handleBack.bind(this));
		this.handlers.set('jump', this.handleJump.bind(this));
		this.handlers.set('forward', this.handleForward.bind(this));
		this.handlers.set('last', this.handleLast.bind(this));
		this.handlers.set('remove', this.handleRemove.bind(this));

		for (const action of this.actions) {
			if (!action.handler || action.url) continue;
			this.handlers.set(action.id, async (interaction: MessageComponentInteraction) => {
				return action.handler!(interaction, this);
			});
		}

		if (this.resolveOn) {
			const existing = this.handlers.get(this.resolveOn);
			this.handlers.set(this.resolveOn, async (interaction: MessageComponentInteraction) => {
				if (!this.checkUser(interaction)) return false;
				const pageIndex = this.currentPage;
				if (existing) await existing.call(this, interaction);
				return this.choose(pageIndex);
			});
		}
	}

	protected async handleFirst(interaction: MessageComponentInteraction): Promise<boolean> {
		if (!this.checkUser(interaction)) return false;
		if (this.currentPage === 0) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'prev');
			}
			return false;
		}
		this.currentPage = 0;
		await this.update(interaction);
		return false;
	}

	protected async handleBack(interaction: MessageComponentInteraction): Promise<boolean> {
		if (!this.checkUser(interaction)) return false;
		if (this.currentPage <= 0) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'prev');
			}
			return false;
		}
		this.currentPage--;
		await this.update(interaction);
		return false;
	}

	protected async handleForward(interaction: MessageComponentInteraction): Promise<boolean> {
		if (!this.checkUser(interaction)) return false;
		if (this.currentPage >= this.getPageCount() - 1) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'next');
			}
			return false;
		}
		this.currentPage++;
		await this.update(interaction);
		return false;
	}

	protected async handleLast(interaction: MessageComponentInteraction): Promise<boolean> {
		if (!this.checkUser(interaction)) return false;
		if (this.currentPage === this.getPageCount() - 1) {
			if (this.onBoundary) {
				await this.runBoundary(interaction, 'next');
			}
			return false;
		}
		this.currentPage = this.pages.length - 1;
		await this.update(interaction);
		return false;
	}

	protected async runBoundary(
		interaction: MessageComponentInteraction,
		direction: 'prev' | 'next'
	): Promise<void> {
		try {
			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferUpdate();
			}
			await interaction.editReply({ components: this.getLoadingComponents() } as any).catch(() => null);
			await this.onBoundary!(direction, interaction);
			this.collector.stop('Aborted');
		}
		catch {
			await this.update(interaction);
		}
	}

	protected async handleJump(interaction: MessageComponentInteraction): Promise<boolean> {
		if (!this.checkUser(interaction)) return false;
		const modal = new ModalBuilder()
			.setCustomId(this.id.toString())
			.setTitle(this.client.user!.username);
		const pageInput = new TextInputBuilder()
			.setCustomId('pageInput')
			.setLabel(this.prompt)
			.setStyle(TextInputStyle.Short)
			.setRequired(true);
		modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(pageInput) as any);
		await interaction.showModal(modal);
		try {
			const response = await interaction.awaitModalSubmit({
				filter: mint => mint.user === interaction.user,
				time: 15000,
				idle: this.jumpTimeout,
			});
			await response.deferUpdate();
			const input = response.fields.getTextInputValue('pageInput');
			const newPage = parseInt(input, 10);
			if (!input || isNaN(newPage) || newPage < 1 || newPage > this.getPageCount()) {
				await response.followUp({
					content: `Invalid page number. Please enter a number between 1 and ${this.getPageCount()}.`,
					flags: MessageFlags.Ephemeral,
				} as any);
				return false;
			}
			this.currentPage = newPage - 1;
			await this.update(response);
			return false;
		}
		catch {
			// Modal dismissed or timed out — silently ignore
			return false;
		}
	}

	protected async handleRemove(interaction: MessageComponentInteraction): Promise<boolean> {
		if (!this.checkUser(interaction)) return false;
		const message = interaction.message as Message;
		if (message.deletable) {
			this.collector.stop('Aborted');
			await message.delete();
			return true;
		}
		return false;
	}

	stopCollector(reason?: string) {
		this.collector?.stop(reason);
	}
}
