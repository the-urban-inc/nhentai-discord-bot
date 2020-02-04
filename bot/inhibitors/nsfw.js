const { Inhibitor } = require('discord-akairo');

module.exports = class NSFWInhibitor extends Inhibitor {
    constructor() {
        super('nsfw', {
            reason: 'nsfw'
        })
    }

    exec(message, command) {
        const ok = (!message.channel.nsfw && (command.category == 'general' || command.category == 'images'));
        if (ok) message.channel.send(this.client.embeds('error', '🔞 This command cannot be run in a SFW channel.'));
        return ok;
    }
};