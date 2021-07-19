import { Client } from './Client';
import {
    ApplicationCommandData,
    ApplicationCommandOptionData,
    CommandInteraction,
    Message,
    PermissionString,
    User,
} from 'discord.js';

export interface CommandOptions extends ApplicationCommandData {
    name: string;
    description: string;
    nsfw?: boolean;
    cooldown?: number;
    owner?: boolean;
    clone?: {
        keyword: string;
        clones: string[];
    };
    permissions?: PermissionString[];
    options?: ApplicationCommandOptionData[];
    defaultPermission?: boolean;
}

const p = <const>{
    name: 'private',
    type: 'BOOLEAN',
    description: 'Whether to send the command in private',
};

export interface Command {
    clone?(): Command;
}
export abstract class Command {
    client: Client;
    data: CommandOptions;
    abstract exec(
        interaction: CommandInteraction,
        options?: { internal?: boolean; message?: Message; user?: User }
    ): any | Promise<any>;
    constructor(client: Client, commandOptions: CommandOptions) {
        this.client = client;
        commandOptions.options ? commandOptions.options.push(p) : (commandOptions.options = [p]);
        this.data = commandOptions;
    }
}
