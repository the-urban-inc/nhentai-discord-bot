import Inhibitor from '@inari/struct/bot/Inhibitor';
import { Message } from 'discord.js';
import * as DB from '@inari/struct/db'

export default class extends Inhibitor {
    constructor() {
        super('testNSFW', {
            reason: 'parsed',
            type: 'all'
        })
    }

    async parse(message: Message) {
        let parsed = await this.client.commandHandler.parseCommand(message);
        if (!parsed.command) {
            const overParsed = await this.client.commandHandler.parseCommandOverwrittenPrefixes(message);
            if (overParsed.command || (parsed.prefix == null && overParsed.prefix != null)) {
                parsed = overParsed;
            }
        }
        return parsed;
    }

    async exec(message: Message) {
        try {
            const test = await this.parse(message);
            const { prefix, command, afterPrefix, alias, content } = test;
            if (command) {
                if (afterPrefix.startsWith('nsfw_')) return true;
                if (!content.length) return false;
                if (['help', 'halp', 'h'].includes(alias)) {
                    let nsfwPrefix = this.client.config.settings.prefix.nsfw;
                    if (message.guild) nsfwPrefix = nsfwPrefix.concat((await DB.Server.prefix(message, 'nsfw', 'list')).map(pfx => pfx.id));
                    if (nsfwPrefix.includes(prefix) && Array.from(this.client.commandHandler.aliases.keys()).includes(`nsfw_${content}`)) {
                        message.content = `${prefix}${alias} nsfw_${content}`
                        return this.client.commandHandler.handle(message);
                    }
                }
                return false;
            }
            if (prefix && afterPrefix) {
                message.content = `${prefix}nsfw_${afterPrefix}`;
                return this.client.commandHandler.handle(message);
            }
            return false;
        } catch (err) {
            this.client.logger.error(err);
            message.channel.send(this.client.embeds.internalError(err));
            return false;
        }
    }
};