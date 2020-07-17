const { MessageEmbed, ReactionCollector } = require('discord.js');
const User = require('../models/user');
const logger = require('./logger');

class ReactionHandler extends ReactionCollector {
	constructor(message, filter, options, display, emojis) {
		super(message, filter, options);

		this.display = display;

		this.methodMap = new Map(Object.entries(this.display.emojis).map(([key, value]) => [value, key]));

		this.currentPage = this.options.startPage || (this.display.infoPage ? -1 : 0);

		this.promptJump = this.options.prompt || 'Which page would you like to jump to?';

		this.promptAuto = this.options.prompt || 'Starting auto session.\nHow many seconds would you prefer me waiting in between pages?';

		this.time = typeof this.options.time === 'number' ? this.options.time : 30000;

		this.awaiting = false;

		this.selection = this.display.emojis.zero ? new Promise((resolve, reject) => {
			this.reject = reject;
			this.resolve = resolve;
		}) : Promise.resolve(null);

		this.reactionsDone = false;

		this.automode = null;

		if (emojis.length) this._queueEmojiReactions(emojis.slice());
		else return this._stop();

		this.on('collect', (reaction, user) => {
			this.resetTimer({ idle: 300000 });
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
		if (this.currentPage >= this.display.pages.length - 1) return;
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
		const message = await this.message.channel.send(this.display.client.embeds('info', this.promptJump));
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
		const message = await this.message.channel.send(this.display.client.embeds('info', this.promptAuto));
		const collected = await this.message.channel.awaitMessages(mess => mess.author === user, { max: 1, time: this.time });
		this.awaiting = false;
		await message.delete();
		if (!collected.size) return;
		const seconds = parseInt(collected.first().content);
		collected.first().delete();
		this.update();
		this.automode = setInterval(() => {
			if (this.currentPage >= this.display.pages.length - 1) {
				clearInterval(this.automode);
				return this.message.channel.send(this.display.client.embeds('info', 'Reached last page. Stopping auto session.')).then(message => message.delete({ timeout: 5000 }));
			}
			this.currentPage++;
			this.update();
		}, seconds * 1000);
	}

	info() {
		this.message.edit(this.display.infoPage);
	}

	async pause() {
		if (this.automode) {
			clearInterval(this.automode);
			return this.message.channel.send(this.display.client.embeds('info', 'Stopped current auto session.')).then(message => message.delete({ timeout: 5000 }));
		} else return this.message.channel.send(this.display.client.embeds('info', 'There\'s no existing auto session. Nothing happened.')).then(message => message.delete({ timeout: 5000 }));
	}

	async love() {
		let id = this.display.gid || this.display.pages[this.currentPage].id;
		let name = (this.display.gid ? this.display.infoPage.author.name : this.display.pages[this.currentPage].embed.title);
		let failed = false, adding = false;
		await User.findOne({
            userID: this.display.requestMessage.author.id
        }, (err, user) => {
            if (err) { logger.error(err); failed = true; return; }
            if (!user) {
                const newUser = new User({
                    userID: this.display.requestMessage.author.id,
                    favorites: [`${id} ${name}`]
                });
				newUser.save().catch(err => { logger.error(err); failed = true; });
				adding = true;
            } else {
				if (user.favorites.includes(`${id} ${name}`)) {
					user.favorites.splice(user.favorites.indexOf(`${id} ${name}`), 1);
				} else { 
					user.favorites.push(`${id} ${name}`); 
					adding = true; 
				}
                return user.save().catch(err => { logger.error(err); failed = true; });
            }
		});
		if (!failed) return this.message.channel.send(this.display.client.embeds('info', adding ? `Added ${id} to favorites.` : `Removed ${id} from favorites.`)).then(message => message.delete({ timeout: 5000 }));
		return this.message.channel.send(this.display.client.embeds('error'));
	}
	
	async remove() {
		if (this.automode) clearInterval(this.automode);
		if (this.display.awaitMessage.deletable && this.display.awaitMessage != this.display.requestMessage) await this.display.awaitMessage.delete();
		if (this.message.deletable) await this.message.delete();
		if (this.display.previousDisplay) {
			// await this.display.previousDisplay.remove();
		} else {
			if (this.display.requestMessage.deletable) await this.display.requestMessage.delete();
		}
	}
    
	update() {
		if (this.currentPage == -1) this.currentPage = 0;
		this.message.edit({ embed: this.display.pages[this.currentPage].embed });
	}
	
	async _stop() {
		if (this.resolve) this.resolve(null);
		super.stop();
	}
    
	async _queueEmojiReactions(emojis) {
		if (this.message.deleted) return this._stop();
		if (this.ended) return this.message.reactions.removeAll();
		await this.message.react(emojis.shift());
		if (emojis.length) return this._queueEmojiReactions(emojis);
		this.reactionsDone = true;
		return null;
	}

}

module.exports = ReactionHandler;