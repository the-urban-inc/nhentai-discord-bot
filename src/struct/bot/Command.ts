import { Command, CommandOptions } from 'discord-akairo';
import type { InariClient } from './Client';

type _ = {
    [key: string]: string[];
};

export interface InariCommandOptions extends CommandOptions {
    nsfw?: boolean;
    areMultipleCommands?: boolean;
    isConditionalorRegexCommand?: boolean;
    subAliases?: _;
}

export default class extends Command {
    client: InariClient;
    nsfw?: boolean;
    areMultipleCommands: boolean;
    isConditionalorRegexCommand?: boolean;
    subAliases: _;
    constructor(id: string, options?: InariCommandOptions) {
        options.typing = true;
        super(id, options);
        const {
            areMultipleCommands = false,
            isConditionalorRegexCommand = false,
            subAliases = {},
        } = options;
        this.areMultipleCommands = Boolean(areMultipleCommands);
        this.isConditionalorRegexCommand = Boolean(isConditionalorRegexCommand);
        if (this.areMultipleCommands && Object.keys(subAliases).length !== 0)
            this.subAliases = subAliases;
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
