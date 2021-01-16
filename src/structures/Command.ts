import { Command as C, CommandOptions as CO } from 'discord-akairo';
import type { Client } from './Client';

type SubAlias = {
    [key: string]: {
        aliases?: string[];
        description: string;
        examples: string[];
        additionalInfo?: string;
    };
};

export interface CommandOptions extends CO {
    nsfw?: boolean;
    isConditionalorRegexCommand?: boolean;
    subAliases?: SubAlias;
    description?: {
        content?: string;
        usage?: string;
        examples?: string[];
        additionalInfo?: string;
    }
}

export class Command extends C {
    client: Client;
    nsfw?: boolean;
    areMultipleCommands: boolean;
    isConditionalorRegexCommand: boolean;
    subAliases: SubAlias;
    constructor(id: string, options?: CommandOptions) {
        options.channel = 'guild';
        options.typing = true;
        super(id, options);
        const { isConditionalorRegexCommand = false, subAliases = {} } = options;
        this.isConditionalorRegexCommand = Boolean(isConditionalorRegexCommand);
        this.subAliases = subAliases;
        this.areMultipleCommands = Object.keys(this.subAliases).length !== 0;
        if ('nsfw' in options) {
            this.nsfw = Boolean(options.nsfw);
            this.prefix = async message => {
                if (
                    !this.client.commandHandler.splitPrefix ||
                    !this.client.commandHandler.splitPrefix.has(message.guild.id)
                )
                    await this.client.commandHandler.updatePrefix(message);
                const { nsfw, sfw } = this.client.commandHandler.splitPrefix.get(message.guild.id);
                return this.nsfw ? nsfw : sfw;
            };
        }
    }
}
