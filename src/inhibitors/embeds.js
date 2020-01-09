const { Inhibitor } = require('discord-akairo');

module.exports = class DisabledEmbedLinksInhibitor extends Inhibitor {
    constructor() {
        super('embeds', {
            reason: 'embeds'
        });
    }

    exec(message) {
        if (!message.guild) return false;
        return !message.channel.permissionsFor(this.client.user).has('EMBED_LINKS');
    }
};
