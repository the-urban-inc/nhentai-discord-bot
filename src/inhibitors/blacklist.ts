import Inhibitor from '@nhentai/struct/bot/Inhibitor';
import { Message } from 'discord.js';

export default class extends Inhibitor {
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