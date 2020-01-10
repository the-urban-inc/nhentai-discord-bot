const { MessageEmbed: Embed } = require('discord.js');
const ReactionHandler = require('./reactionHandler');

class RichDisplay {

	constructor(embed = new Embed()) {

		this.embedTemplate = embed;

		this.pages = [];

		this.infoPage = null;

		this.gid = null;

		this.requester = null;

		this.emojis = {
			first: '⏪',
			back: '◀',
			forward: '▶',
			last: '⏩',
			jump: '↗️',
			info: 'ℹ️',
			auto: '🇦',
			stop: '⏹',
			love: '❤️',
			remove: '❌'
		};

		this.automode = false;

		this.footered = false;
	}

	get template() {
		return new Embed(this.embedTemplate);
	}

	setEmojis(emojis) {
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

	setGID(id) {
		this.gid = id;
		return this;
	}

	setRequester(id) {
		this.requester = id;
		return this;
	}

	addPage(embed, id = null) {
		this.pages.push({ 
			id: id,
			embed: this._handlePageGeneration(embed) 
		});
		return this;
	}

	setInfoPage(embed) {
		this.infoPage = this._handlePageGeneration(embed);
		return this;
	}

	async run(message, options = {}) {
		if (!this.footered) this._footer();
		if (!options.filter) options.filter = () => true;
		const emojis = this._determineEmojis(
			[],
			!('remove' in options) || ('remove' in options && options.stop),
			!('jump' in options) || ('jump' in options && options.jump),
			!('firstLast' in options) || ('firstLast' in options && options.firstLast)
		);
		let msg;
		if (message.editable) {
			await message.edit({ embed: this.infoPage || this.pages[options.startPage || 0].embed });
			msg = message;
		} else msg = await message.channel.send(this.infoPage || this.pages[options.startPage || 0].embed);
		return new ReactionHandler(
			msg,
			(reaction, user) => emojis.includes(reaction.emoji.id || reaction.emoji.name) && user !== message.client.user && options.filter(reaction, user),
			options,
			this,
			emojis
		);
	}

	async _footer() {
		for (let i = 1; i <= this.pages.length; i++) this.pages[i - 1].embed.setFooter(`Page ${i} of ${this.pages.length}`);
		// if (this.infoPage) this.infoPage.setFooter('General Info');
	}

	_determineEmojis(emojis, remove, jump, firstLast) {
		if (this.pages.length > 1 || this.infoPage) {
			if (firstLast) emojis.push(this.emojis.first, this.emojis.back, this.emojis.jump, this.emojis.forward, this.emojis.last);
			else emojis.push(this.emojis.back, this.emojis.jump, this.emojis.forward);
		}
		if (this.infoPage) emojis.push(this.emojis.info);
		if (this.automode) emojis.push(this.emojis.auto, this.emojis.stop);
		if (this.requester) emojis.push(this.emojis.love);
		if (remove) emojis.push(this.emojis.remove);
		return emojis;
	}

	_handlePageGeneration(cb) {
		if (typeof cb === 'function') {
			// eslint-disable-next-line callback-return
			const page = cb(this.template);
			if (page instanceof Embed) return page;
		} else if (cb instanceof Embed) {
			return cb;
		}
		throw new Error('Expected a MessageEmbed or Function returning a MessageEmbed');
	}

}

module.exports = RichDisplay;