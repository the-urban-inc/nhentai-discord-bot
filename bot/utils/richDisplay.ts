import { Message, MessageEmbed, MessageReaction, User } from 'discord.js';
import { NhentaiClient } from '../struct/Client';
import { ReactionHandler } from './reactionHandler';

export class RichEmojis {
	first: '⏪'
	back: '◀'
	forward: '▶'
	last: '⏩'
	jump: '↗️'
	info: 'ℹ️'
	auto: '🇦'
	pause: '⏹'
	love: '❤️'
	remove: '🗑'
};

interface RichPage {
	id: string,
	embed: MessageEmbed
}

export interface RichOptions {
	startPage: number,
	prompt: string,
	time: number
}

export class RichDisplay {

	client: NhentaiClient
	embedTemplate: MessageEmbed
	pages: Array<RichPage>
	infoPage: MessageEmbed
	gid: string
	requestMessage: Message
	awaitMessage: Message
	emojis: RichEmojis
	previousDisplay: RichDisplay
	automode: boolean
	footered: boolean

	constructor(client: NhentaiClient, embed = new MessageEmbed()) {
		this.client = client;

		this.embedTemplate = embed;

		this.pages = [];

		this.infoPage = null;

		this.gid = null;

		this.requestMessage = null;
		this.awaitMessage = null;

		this.previousDisplay = null;

		this.automode = false;

		this.footered = false;
	}

	get template() {
		return new MessageEmbed(this.embedTemplate);
	}

	setEmojis(emojis: object) {
		Object.assign(this.emojis, emojis);
		return this;
	}

	useCustomFooters() {
		this.footered = true;
		return this;
	}

	useAutoMode() {
		this.automode = true;
		return this;
	}

	setGID(id: string) {
		this.gid = id;
		return this;
	}

	useMultipleDisplay(display: RichDisplay) {
		this.previousDisplay = display;
		return this;
	}

	addPage(embed: MessageEmbed, id = '') {
		this.pages.push({ 
			id: id,
			embed: this._handlePageGeneration(embed) 
		});
		return this;
	}

	setInfoPage(embed: MessageEmbed) {
		this.infoPage = this._handlePageGeneration(embed);
		return this;
	}

	async run(requestMessage: Message, awaitMessage: Message, filter: Array<string>, options?: RichOptions) {
		if (!this.footered) this._footer();
		const emojis = this._determineEmojis(
			[],
			!(filter.includes('remove')),
			!(filter.includes('firstLast')),
			!(filter.includes('love')),
			(filter.includes('images'))
		);
		this.requestMessage = requestMessage;
		this.awaitMessage = awaitMessage;
		let msg = await requestMessage.channel.send(this.infoPage || this.pages[options.startPage || 0].embed);
		return new ReactionHandler(
			msg,
			(reaction: MessageReaction, user: User) => emojis.includes(reaction.emoji.id || reaction.emoji.name) && user !== awaitMessage.client.user,
			options,
			this,
			emojis
		);
	}

	async _footer() {
		for (let i = 1; i <= this.pages.length; i++) this.pages[i - 1].embed.setFooter(`Page ${i} of ${this.pages.length}`);
		// if (this.infoPage) this.infoPage.setFooter('General Info');
	}

	_determineEmojis(emojis: Array<string>, remove: boolean, firstLast: boolean, love: boolean, images: boolean) {
		if (images) {
			emojis.push(this.emojis.remove);
			return emojis;
		}
		if (this.pages.length > 1 || this.infoPage) {
			if (firstLast) emojis.push(this.emojis.first, this.emojis.back, this.emojis.jump, this.emojis.forward, this.emojis.last);
			else emojis.push(this.emojis.back, this.emojis.jump, this.emojis.forward);
		}
		if (this.infoPage) emojis.push(this.emojis.info);
		if (this.automode) emojis.push(this.emojis.auto, this.emojis.pause);
		if (love) emojis.push(this.emojis.love);
		if (remove) emojis.push(this.emojis.remove);
		return emojis;
	}

	_handlePageGeneration(cb: unknown) {
		if (typeof cb === 'function') {
			// eslint-disable-next-line callback-return
			const page = cb(this.template);
			if (page instanceof MessageEmbed) return page;
		} else if (cb instanceof MessageEmbed) {
			return cb;
		}
		throw new Error('Expected a MessageEmbed or Function returning a MessageEmbed');
	}

}