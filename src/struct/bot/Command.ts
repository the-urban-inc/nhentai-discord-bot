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
                if (!this.client.commandHandler.splitPrefix || !this.client.commandHandler.splitPrefix.has(message.guild.id)) await this.client.commandHandler.updatePrefix(message);
                const { nsfw, sfw } = this.client.commandHandler.splitPrefix.get(message.guild.id);
                return this.nsfw ? nsfw : sfw;
            }
        }
    }
}
