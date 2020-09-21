import { Command, CommandOptions } from 'discord-akairo';
import type { NhentaiClient } from './Client';

export interface NhentaiCommandOptions extends CommandOptions {
    areMultipleCommands?: boolean;
}

export default class extends Command {
    client: NhentaiClient;
    constructor(id: string, options?: NhentaiCommandOptions) {
        super(id, options);
    }
}
