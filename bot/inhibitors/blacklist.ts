import { Message } from 'discord.js';
import { Inhibitor } from 'discord-akairo';

export class BlacklistInhibitor extends Inhibitor {
    constructor() {
        super('blacklist', {
            reason: 'blacklist',
            type: 'all'
        })
    }

    exec(message: Message) {
        // Haha chet me may de
        const blacklist = [''];
        return blacklist.includes(message.author.id);
    }
};