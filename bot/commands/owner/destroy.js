const { Command } = require('discord-akairo');

module.exports = class DestroyCommand extends Command {
    constructor() {
        super('destroy', {
            aliases: ['destroy'],
            category: 'owner',
            ownerOnly: true,
            protected: true,
            args: [{
                id: 'force',
                match: 'flag',
                flag: '--force'
            }]
        });
    }

    exec(message, { force }) {
        if (force) return process.exit(0);
        return message.channel.send('Disconnecting bot...').then(() => this.client.destroy());
    }
};
