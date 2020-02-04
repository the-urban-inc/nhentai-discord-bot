const { Listener } = require('discord-akairo');
const { capitalize } = require('../../utils/extensions');

module.exports = class MissingPermissionsListener extends Listener {
    constructor() {
        super('missingPermissions', {
            emitter: 'commandHandler',
            event: 'missingPermissions',
            category: 'commandHandler'
        });
    }

    exec(message, command, type, missing) {
        this.client.logger.log(`=> ${command.id} ~ ${type} is missing permissions: ${missing}`);
        if (message.guild && !message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES')) return;
        message.channel.send(new MessageEmbed()
        .setAuthor('❌ Error')
        .setColor('#ff0000')
        .setDescription(`${capitalize(type)} is missing the following permissions: ${missing.join(', ')}.`)
        .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
        .setTimestamp());
    }
};
