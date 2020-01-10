const { Listener } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { error } = require('../../utils/embeds');

module.exports = class ErrorListener extends Listener {
    constructor() {
        super('error', {
            emitter: 'commandHandler',
            event: 'error',
            category: 'commandHandler'
        });
    }

    exec(err, message) {
        this.client.logger.error('A handler error occured.');
        this.client.logger.stackTrace(err);
        if (message.guild && !message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES')) return;
        error(message);
    }
};
