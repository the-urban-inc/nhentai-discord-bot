import { Client } from './Client';
import {
    ApplicationCommandOptionData,
    ChatInputApplicationCommandData,
    CommandInteraction,
    ContextMenuInteraction,
    MessageApplicationCommandData,
    PermissionString,
    User,
} from 'discord.js';

export interface CommandOptions extends ChatInputApplicationCommandData {
    name: string;
    type: 'CHAT_INPUT';
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

export interface MessageCommandOptions extends MessageApplicationCommandData {
    name: string;
    type: 'MESSAGE';
    nsfw?: boolean;
    cooldown?: number;
    owner?: boolean;
    permissions?: PermissionString[];
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
        options?: { internal?: boolean; user?: User }
    ): any | Promise<any>;
    constructor(client: Client, commandOptions: CommandOptions) {
        this.client = client;
        commandOptions.options ? commandOptions.options.push(p) : (commandOptions.options = [p]);
        this.data = commandOptions;
    }
}

export abstract class ContextMenuCommand {
    client: Client;
    data: MessageCommandOptions;
    abstract exec(interaction: ContextMenuInteraction): any | Promise<any>;
    constructor(client: Client, commandOptions: MessageCommandOptions) {
        this.client = client;
        this.data = commandOptions;
    }
}