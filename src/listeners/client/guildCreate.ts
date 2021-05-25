import { Listener } from '@structures';
import type { Guild } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('new-guild', {
            category: 'client',
            emitter: 'client',
            event: 'guildCreate',
        });
    }

    exec(guild: Guild) {
        this.client.logger.discord = true;
        this.client.logger.info(
            `Joined guild "${guild.name}" (ID: ${guild.id}) (Total: ${this.client.guilds.cache.size} guilds)`
        );
        this.client.logger.discord = false;
    }
}
