import { Listener } from '@structures';

export default class extends Listener {
    constructor() {
        super('ready', {
            emitter: 'client',
            event: 'ready',
            category: 'client',
        });
    }

    cur = 0;

    async getRandomCode() {
        const data = await this.client.nhentai.random();
        return data?.gallery?.id?.toString() ?? '177013';
    }

    async changePresence() {
        await this.client.user.setPresence({
            activity: [
                {
                    name: [
                        'Abandon all hope, ye who enter here',
                        'ここから入らんとする者は一切の希望を放棄せよ',
                    ][Math.round(Math.random())],
                },
                { name: await this.getRandomCode(), type: <const>'WATCHING' },
                {
                    name: `your commands • ${this.client.config.settings.prefix.nsfw[0]}help`,
                    type: <const>'LISTENING',
                },
            ][this.cur],
        });
        this.cur = (this.cur + 1) % 3;
        setTimeout(this.changePresence.bind(this), 300000);
    }

    exec() {
        this.client.logger.info(
            `[READY] Logged in as ${this.client.user.tag}! ID: ${this.client.user.id}`
        );
        this.changePresence();
    }
}
