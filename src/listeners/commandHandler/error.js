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

    exec(error, message) {
        this.client.logger.error('A handler error occured.');
        this.client.logger.stackTrace(error);
        if (message.guild && !message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES')) return;
        message.channel.send(new MessageEmbed()
        .setAuthor('❌ Error')
        .setColor('#ff0000')
        .setDescription('An unexpected error has occurred.')
        .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
        .setTimestamp());
    }
};
