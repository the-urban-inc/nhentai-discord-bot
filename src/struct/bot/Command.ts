import { Command, CommandOptions } from 'discord-akairo';
import type { InariClient } from './Client';
import * as DB from '@inari/struct/db';

export interface InariCommandOptions extends CommandOptions {
    nsfw?: boolean;
    areMultipleCommands?: boolean;
}

export default class extends Command {
    client: InariClient;
    nsfw?: boolean;
    areMultipleCommands: boolean;
    constructor(id: string, options?: InariCommandOptions) {
        options.typing = true;
        super(id, options);
        const { areMultipleCommands = false } = options;
        this.areMultipleCommands = Boolean(areMultipleCommands);
        if ('nsfw' in options) {
            this.nsfw = Boolean(options.nsfw);
            this.prefix = async message => {
                const prefix = this.client.config.settings.prefix[this.nsfw ? 'nsfw' : 'sfw'];
                if (message.guild) return prefix.concat((await DB.Server.prefix(message, this.nsfw ? 'nsfw' : 'sfw', 'list')).map(pfx => pfx.id));
                return prefix;
            }
        }
    }
}
