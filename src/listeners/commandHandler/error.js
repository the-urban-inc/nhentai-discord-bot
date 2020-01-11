const { Listener } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

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
        return message.channel.send(this.client.embeds('error'));
    }
};
