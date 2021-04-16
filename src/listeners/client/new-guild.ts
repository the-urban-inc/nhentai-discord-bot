import { Listener } from '@structures';
import type { Guild } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('new-guild', {
            category: 'client',
            emitter: 'client',
            event: 'guildCreate'
        })
    }

    exec(guild : Guild) {
        this.client.logger.info(`Joined guild ID ${guild.id} - "${guild.name}"`, true);
    }
}