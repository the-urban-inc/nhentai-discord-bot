import { Listener } from '@structures';

export default class extends Listener {
    constructor() {
        super('unhandledRejection', {
            emitter: 'process',
            event: 'unhandledRejection',
            category: 'process',
        });
    }

    exec(err: Error) {
        this.client.logger.error('An unhandled error occurred.');
        this.client.logger.stackTrace(err);
    }
}
