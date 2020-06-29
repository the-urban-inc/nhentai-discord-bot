const { Inhibitor } = require('discord-akairo');
const { DMChannel } = require('discord.js');

module.exports = class NSFWInhibitor extends Inhibitor {
    constructor() {
        super('nsfw', {
            reason: 'nsfw'
        })
    }

    exec(message, command) {
        let ok = (!message.channel.nsfw && (command.category == 'general' || command.category == 'images'));
        // bypass check for DMs
        if (message.channel instanceof DMChannel) ok = false;
        if (ok) message.channel.send(this.client.embeds('error', '🔞 This command cannot be run in a SFW channel.'));
        return ok;
    }
};