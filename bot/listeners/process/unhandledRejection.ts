import { Listener } from 'discord-akairo';
import { Logger } from '@nhentai/utils/logger';

export class UnhandledRejectionListener extends Listener {
    constructor() {
        super('unhandledRejection', {
            emitter: 'process',
            event: 'unhandledRejection',
            category: 'process'
        });
    }

    exec(error: Error) {
        Logger.error('An unhandled error occurred.');
        Logger.stackTrace(error);
    }
};
