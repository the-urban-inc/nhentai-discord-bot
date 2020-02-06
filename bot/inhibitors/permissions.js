const { Inhibitor } = require('discord-akairo');

module.exports = class PermissionsInhibitor extends Inhibitor {
    constructor() {
        super('permissions', {
            reason: 'permissions'
        });
    }

    async exec(message) {
        if (!message.guild) return false;
        let ok = false, requirements = [];
        Object.keys(this.client.permissions).forEach((x) => { if (!message.channel.permissionsFor(this.client.user).has(x)) ok = true, requirements.push(this.client.permissions[x]); });
        if (ok) {
            if (!message.author.dmChannel) await message.author.createDM();
            if (requirements.includes('Send Messages') && message.author.dmChannel) message.author.dmChannel.send(this.client.embeds('error', `I can't send messages in that channel. Make sure I have the proper permissions before calling me.`)) 
            else message.channel.send(this.client.embeds('error', `I'm missing the following permissions to execute your command: ${requirements.map((x) => `${x}`).join(' ')}.`))
        }
        return ok;
    }
};
