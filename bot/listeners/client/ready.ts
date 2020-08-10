import { Listener } from 'discord-akairo';
import { NhentaiClient } from '@nhentai/struct/Client';
import { Logger } from '@nhentai/utils/logger';
const { PREFIX } = process.env;

export class ReadyListener extends Listener {
    constructor() {
        super('ready', {
            emitter: 'client',
            event: 'ready',
            category: 'client'
        });
    }

    exec() {
        Logger.info(`[READY] Logged in as ${this.client.user.tag}! ID: ${this.client.user.id}`);
        this.client.user.setActivity('your commands', { type: 'LISTENING' });
        this.client.setTimeout(() => { this.client.setInterval(async () => {
            let code = '177013';
            const data = await (this.client as NhentaiClient).nhentai.random().then(data => data).catch(err => Logger.error(err));
            code = (data ? data.id.toString() : code);
            this.client.user.setActivity(`${code} • ${PREFIX}help`, { type: 'WATCHING' });
        }, 300000); }, 10000);
    }
};
