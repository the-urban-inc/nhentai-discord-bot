const { Listener } = require('discord-akairo');

module.exports = class ReconnectingListener extends Listener {
    constructor() {
        super('reconnecting', {
            emitter: 'client',
            event: 'reconnecting',
            category: 'client'
        });
    }

    exec() {
        this.client.logger.info('nHentai reconnecting.');
        process.exit();
    }
};
