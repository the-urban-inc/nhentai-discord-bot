const { ReactionCollector } = require('discord.js');

class ReactionHandler extends ReactionCollector {
	constructor(message, filter, options, display, emojis) {
		super(message, filter, options);

		this.display = display;

		this.methodMap = new Map(Object.entries(this.display.emojis).map(([key, value]) => [value, key]));

		this.currentPage = this.options.startPage || 0;

		this.promptJump = this.options.prompt || 'Which page would you like to jump to?';

		this.promptAuto = this.options.prompt || 'Starting auto session.\nHow many seconds would you prefer me waiting in between pages?';

		this.time = typeof this.options.time === 'number' ? this.options.time : 30000;

		this.awaiting = false;

		this.reactionsDone = false;

		this.automode = null;

		if (emojis.length) this._queueEmojiReactions(emojis.slice());
		else return this.stop();

		this.on('collect', (reaction, user) => {
			reaction.users.remove(user);
			this[this.methodMap.get(reaction.emoji.id || reaction.emoji.name)](user);
		});
		this.on('end', () => {
			if (this.reactionsDone && !this.message.deleted) this.message.reactions.removeAll();
		});
	}

	first() {
		this.currentPage = 0;
		this.update();
	}

	back() {
		if (this.currentPage <= 0) return;
		this.currentPage--;
		this.update();
	}

	forward() {
		if (this.currentPage > this.display.pages.length - 1) return;
		this.currentPage++;
		this.update();
	}

	last() {
		this.currentPage = this.display.pages.length - 1;
		this.update();
	}

	async jump(user) {
		if (this.awaiting) return;
		this.awaiting = true;
		const message = await this.message.channel.send(this.promptJump);
		const collected = await this.message.channel.awaitMessages(mess => mess.author === user, { max: 1, time: this.time });
		this.awaiting = false;
		await message.delete();
		if (!collected.size) return;
		const newPage = parseInt(collected.first().content);
		collected.first().delete();
		if (newPage && newPage > 0 && newPage <= this.display.pages.length) {
			this.currentPage = newPage - 1;
			this.update();
		}
	}

	async auto(user) {
		if (this.awaiting) return;
		this.awaiting = true;
		const message = await this.message.channel.send(this.promptAuto);
		const collected = await this.message.channel.awaitMessages(mess => mess.author === user, { max: 1, time: this.time });
		this.awaiting = false;
		await message.delete();
		if (!collected.size) return;
		const seconds = parseInt(collected.first().content);
		collected.first().delete();
		this.update();
		this.automode = setInterval(() => {
			if (this.currentPage > this.display.pages.length - 1) return;
			this.currentPage++;
			this.update();
		}, seconds * 1000);
	}

	info() {
		this.message.edit(this.display.infoPage);
	}

	async stop() {
		if (this.automode) {
			clearInterval(this.automode);
			const message = await this.message.channel.send('Stopped current auto session.');
			await message.delete({ timeout: 3000});
		} else {
			const message = await this.message.channel.send('There\'s no existing auto session. Nothing happened.');
			await message.delete({ timeout: 3000 });
		}
	}
	
	remove() {
		if (this.resolve) this.resolve(null);
		if (this.automode) clearInterval(this.automode);
		this.message.delete();
	}
    
	update() {
		this.message.edit({ embed: this.display.pages[this.currentPage] });
    }
    
	async _queueEmojiReactions(emojis) {
		if (this.message.deleted) return this.stop();
		if (this.ended) return this.message.reactions.removeAll();
		await this.message.react(emojis.shift());
		if (emojis.length) return this._queueEmojiReactions(emojis);
		this.reactionsDone = true;
		return null;
	}

}

module.exports = ReactionHandler;