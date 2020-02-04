const { Listener } = require('discord-akairo');

module.exports = class CommandStartedListener extends Listener {
    constructor() {
        super('commandStarted', {
            emitter: 'commandHandler',
            event: 'commandStarted',
            category: 'commandHandler'
        });
    }

    exec(message, command) {
        this.client.logger.log(`${message.author.tag} (ID: ${message.author.id}) => ${command.id}`);
    }
};
