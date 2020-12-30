import { CommandHandler, CommandUtil } from 'discord-akairo';
import { Message, Collection } from 'discord.js';
import type { InariClient } from './Client';

interface Prefix {
    nsfw: string[];
    sfw: string[];
}

export default class extends CommandHandler {
    client: InariClient;
    splitPrefix: Collection<string, Prefix>;
    async updatePrefix(message: Message) {
        if (!this.splitPrefix) this.splitPrefix = new Collection();
        let { nsfw, sfw } = this.client.config.settings.prefix;
        if (message.guild) {
            nsfw = nsfw.concat(
                (await this.client.db.Server.prefix(message, 'nsfw', 'list')).map(pfx => pfx.id)
            );
            sfw = sfw.concat(
                (await this.client.db.Server.prefix(message, 'sfw', 'list')).map(pfx => pfx.id)
            );
            this.splitPrefix.set(message.guild.id, { nsfw, sfw });
        }
        this.splitPrefix.set(message.channel.id, { nsfw, sfw });
    }
    private async parse(message: Message) {
        let parsed = await super.parseCommand(message);
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
            if (afterPrefix.startsWith('nsfw_') || content.startsWith('nsfw_'))
                return await this.handleDirectCommand(message, content, command);
            if (!content.length) return await this.handleDirectCommand(message, content, command);
            if (['help', 'halp', 'h'].includes(alias)) {
                if (
                    this.splitPrefix.get(message.guild.id).nsfw.includes(prefix) &&
                    Array.from(this.client.commandHandler.aliases.keys()).includes(
                        `nsfw_${content}`
                    )
                ) {
                    message.content = `${prefix}${alias} nsfw_${content}`;
                    return this.test(message);
                }
            }
            return await this.handleDirectCommand(message, content, command);
        }
        if (
            prefix &&
            afterPrefix &&
            Array.from(this.client.commandHandler.aliases.keys()).includes(`nsfw_${afterPrefix}`)
        ) {
            message.content = `${prefix}nsfw_${afterPrefix}`;
            return this.test(message);
        }
        return await this.handleRegexAndConditionalCommands(message);
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
