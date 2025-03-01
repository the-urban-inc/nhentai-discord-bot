import { Client } from './Client';
import {
    ApplicationCommandOptionData,
    ApplicationCommandType,
    AutocompleteInteraction,
    ChatInputApplicationCommandData,
    CommandInteraction,
    MessageApplicationCommandData,
    PermissionsString,
    ApplicationCommandOptionType,
    ContextMenuCommandInteraction,
} from 'discord.js';

export interface CommandOptions extends ChatInputApplicationCommandData {
    name: string;
    type: ApplicationCommandType.ChatInput;
    description: string;
    nsfw?: boolean;
    cooldown?: number;
    owner?: boolean;
    clone?: {
        keyword: string;
        clones: string[];
    };
    permissions?: PermissionsString[];
    options?: ApplicationCommandOptionData[];
    defaultPermission?: boolean;
}

export interface MessageCommandOptions extends MessageApplicationCommandData {
    name: string;
    type: ApplicationCommandType.Message;
    nsfw?: boolean;
    cooldown?: number;
    owner?: boolean;
    permissions?: PermissionsString[];
}

const p = <const>{
    name: 'private',
    type: ApplicationCommandOptionType.Boolean,
    description: 'Whether to send the command in private',
};

export interface Command {
    clone?(): Command;
}
export abstract class Command {
    client: Client;
    data: CommandOptions;
    autocomplete?(interaction: AutocompleteInteraction): any | Promise<any>;
    run?(interaction: CommandInteraction, ...args: any): any | Promise<any>;
    abstract exec(
        interaction: CommandInteraction,
        options?: any,
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
    abstract exec(interaction: ContextMenuCommandInteraction): any | Promise<any>;
    constructor(client: Client, commandOptions: MessageCommandOptions) {
        this.client = client;
        this.data = commandOptions;
    }
}