import Listener from '@inari/struct/bot/Listener';
import { Guild } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('guildCreate', {
            emitter: 'client',
            event: 'guildCreate',
            category: 'client',
        });
    }

    exec(guild: Guild) {
        guild.members.cache.get(this.client.user.id).setNickname('Inari');
    }
}
