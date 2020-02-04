const { Listener } = require('discord-akairo');

module.exports = class ReadyListener extends Listener {
    constructor() {
        super('ready', {
            emitter: 'client',
            event: 'ready',
            category: 'client'
        });
    }

    exec() {
        const activities = [{
            'text': 'your commands',
            'type': 'LISTENING'
        },{
            'text': `177013`,
            'type': 'WATCHING'
        }];
        this.client.logger.info(`[READY] Logged in as ${this.client.user.tag}! ID: ${this.client.user.id}`);
        this.client.setInterval(() => {
            const activity = activities[Math.floor(Math.random()*activities.length)];
            this.client.user.setActivity(activity.text, { type: activity.type });
        }, 60000);
    }
};
