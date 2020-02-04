const { Listener } = require('discord-akairo');

module.exports = class UnhandledRejectionListener extends Listener {
    constructor() {
        super('unhandledRejection', {
            emitter: 'process',
            event: 'unhandledRejection',
            category: 'process'
        });
    }

    exec(error) {
        this.client.logger.error('An unhandled error occurred.');
        this.client.logger.stackTrace(error);
    }
};
