import { CommandHandler, CommandUtil, PrefixSupplier } from 'discord-akairo';
import { Message } from 'discord.js'; 
import type { InariClient } from './Client';

interface Prefix { 
    nsfw: string[];
    sfw: string[];
}

function intoArray(x: string | string[]) {
    if (Array.isArray(x)) {
        return x;
    }
    return [x];
}

function intoCallable(thing: string | string[] | PrefixSupplier) {
    if (typeof thing === 'function') {
        return thing;
    }
    return () => thing;
}

function prefixCompare(aKey: string | PrefixSupplier, bKey: string | PrefixSupplier) {
    if (aKey === '' && bKey === '') return 0;
    if (aKey === '') return 1;
    if (bKey === '') return -1;
    if (typeof aKey === 'function' && typeof bKey === 'function') return 0;
    if (typeof aKey === 'function') return 1;
    if (typeof bKey === 'function') return -1;
    return aKey.length === bKey.length
        ? aKey.localeCompare(bKey)
        : bKey.length - aKey.length;
}

export default class extends CommandHandler {
    client: InariClient;
    splitPrefix: Prefix;
    async updatePrefix(message: Message) {
        let { nsfw, sfw } = this.client.config.settings.prefix;
        if (message.guild) {
            nsfw = nsfw.concat(
                (await this.client.db.Server.prefix(message, 'nsfw', 'list')).map(pfx => pfx.id)
            );
            sfw = sfw.concat(
                (await this.client.db.Server.prefix(message, 'sfw', 'list')).map(pfx => pfx.id)
            );
        }
        this.splitPrefix = { nsfw, sfw };
    }
    private async parse(message: Message) {
        let parsed = await this.parseCommand(message);
        if (!parsed.command) {
            const overParsed = await this.parseCommandOverwrittenPrefixes(message);
            if (overParsed.command || (parsed.prefix == null && overParsed.prefix != null)) {
                parsed = overParsed;
            }
        }
        if (this.commandUtil) {
            message.util.parsed = parsed;
        }
        return parsed;
    }
    private async test(message: Message) {
        const parsed = await this.parse(message);
        const { prefix, command, afterPrefix, alias, content } = parsed;
        if (command) {
            if (afterPrefix.startsWith('nsfw_') || content.startsWith('nsfw_')) return await this.handleDirectCommand(message, content, command);
            if (!content.length) return await this.handleDirectCommand(message, content, command);
            if (['help', 'halp', 'h'].includes(alias)) {
                if (this.splitPrefix.nsfw.includes(prefix) && Array.from(this.client.commandHandler.aliases.keys()).includes(`nsfw_${content}`)) {
                    message.content = `${prefix}${alias} nsfw_${content}`
                    return this.test(message);
                }
            }
            return await this.handleDirectCommand(message, content, command);
        } 
        if (prefix && afterPrefix) {
            message.content = `${prefix}nsfw_${afterPrefix}`;
            return this.test(message);
        }
        return await this.handleRegexAndConditionalCommands(message);
    }
    async parseCommand(message: Message) {
        let prefixes = intoArray(await intoCallable(this.prefix)(message));
        const allowMention = await intoCallable(this.prefix)(message);
        if (allowMention) {
            const mentions = [`<@${this.client.user.id}>`, `<@!${this.client.user.id}>`];
            prefixes = [...mentions, ...prefixes];
        }
        prefixes.sort(prefixCompare);
        return this.parseMultiplePrefixes(message, prefixes.map(p => [p, null]) as any); // as [string, Set<string> | null][]);
    }
    async handle(message: Message) {
        try {
            if (this.fetchMembers && message.guild && !message.member && !message.webhookID) {
                await message.guild.members.fetch(message.author);
            }

            if (await this.runAllTypeInhibitors(message)) {
                return false;
            }

            if (this.commandUtil) {
                if (this.commandUtils.has(message.id)) {
                    message.util = this.commandUtils.get(message.id);
                } else {
                    message.util = new CommandUtil(this, message);
                    this.commandUtils.set(message.id, message.util);
                }
            }

            if (await this.runPreTypeInhibitors(message)) {
                return false;
            }

            return await this.test(message);
        } catch (err) {
            this.emitError(err, message);
            return null;
        }
    }
}
