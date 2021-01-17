import { Listener } from '@structures';

export default class extends Listener {
    constructor() {
        super('disconnect', {
            emitter: 'client',
            event: 'disconnect',
            category: 'client',
        });
    }

    exec() {
        return this.client.logger.warn('[EVENT] Disconnecting...');
    }
}
