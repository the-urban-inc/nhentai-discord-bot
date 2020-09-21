import Listener from '@nhentai/struct/bot/Listener';
const { PREFIX } = process.env;

export default class extends Listener {
    constructor() {
        super('ready', {
            emitter: 'client',
            event: 'ready',
            category: 'client',
        });
    }

    exec() {
        this.client.logger.info(
            `[READY] Logged in as ${this.client.user.tag}! ID: ${this.client.user.id}`
        );
        this.client.user.setActivity('your commands', { type: 'LISTENING' });
        this.client.setTimeout(() => {
            this.client.setInterval(async () => {
                let code = '177013';
                const data = await this.client.nhentai
                    .random()
                    .then(data => data)
                    .catch(err => this.client.logger.error(err));
                code = data ? data.details.id.toString() : code;
                this.client.user.setActivity(`${code} • ${PREFIX}help`, { type: 'WATCHING' });
            }, 300000);
        }, 10000);
    }
}
