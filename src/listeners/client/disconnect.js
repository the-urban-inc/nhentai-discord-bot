const { Listener } = require('discord-akairo');

module.exports = class DisconnectListener extends Listener {
    constructor() {
        super('disconnect', {
            emitter: 'client',
            event: 'disconnect',
            category: 'client'
        });
    }

    exec(closeInfo) {
        if (!closeInfo) {
            this.client.logger.info('[DISCONNECT] nHentai has disconnected for some reason.');
            process.exit();
            return;
        }
        this.client.logger.info(`[DISCONNECT] nHentai disconnected with code ${closeInfo.code}.`);
        process.exit(0);
    }
};
