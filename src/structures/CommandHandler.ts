import { Client } from './Client';
import { Command } from './Command';
import { UserError } from './Error';
import {
    ApplicationCommand,
    ApplicationCommandManager,
    Collection,
    Snowflake,
    TextChannel,
} from 'discord.js';
import { readdirSync } from 'fs';
const { ENVIRONMENT, DEVELOPMENT_GUILD } = process.env;

let startCooldown: () => void;
export class CommandHandler extends ApplicationCommandManager {
    client: Client;
    constructor(client: Client) {
        super(client);
        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isCommand()) return;
            if (!(interaction.channel instanceof TextChannel)) return;
            if (this.client.commands.has(interaction.commandName)) {
                try {
                    await interaction.defer({
                        ephemeral: (interaction.options.get('private')?.value as boolean) ?? false,
                    });
                    const { commands, cooldowns } = this.client;
                    const command = commands.get(interaction.commandName);
                    const { name, permissions, cooldown, nsfw, owner } = command.data;

                    if (owner && interaction.user.id !== this.client.ownerID) {
                        throw new UserError('OWNER_ONLY');
                    }

                    if (!interaction.channel.nsfw && nsfw) {
                        throw new UserError('NSFW_COMMAND_IN_SFW_CHANNEL', interaction.commandName);
                    }

                    if (permissions) {
                        const userPerms = interaction.channel.permissionsFor(interaction.user);
                        if (!userPerms || !userPerms.has(permissions)) {
                            const missing = permissions
                                .filter(p => userPerms.has(p))
                                .map(p => client.util.resolvePerm(p));
                            throw new UserError('MISSING_PERMISSIONS', missing);
                        }
                    }

                    const cooldownAmount = cooldown ?? 0;

                    if (cooldownAmount > 0) {
                        if (!cooldowns.has(name)) {
                            cooldowns.set(name, new Collection());
                        }

                        const now = Date.now();
                        const timestamps = cooldowns.get(name);

                        if (timestamps.has(interaction.user.id)) {
                            const expirationTime =
                                timestamps.get(interaction.user.id) + cooldownAmount;
                            if (now < expirationTime) {
                                const timeLeft = expirationTime - now;
                                throw new UserError('COOLDOWN', +(timeLeft / 1000).toFixed(2));
                            }
                        }
                    }

                    startCooldown = () => {
                        if (cooldownAmount > 0) {
                            const now = Date.now();
                            const timestamps = cooldowns.get(name);
                            timestamps.set(interaction.user.id, now);
                            setTimeout(
                                () => timestamps.delete(interaction.user.id),
                                cooldownAmount
                            );
                        }
                    };

                    this.client.logger.log(
                        `${interaction.user.tag} (ID: ${interaction.user.id}) => ${name}`
                    );

                    await command.exec(interaction);

                    startCooldown();
                } catch (err) {
                    this.client.logger.error(err instanceof UserError ? err.code : err);
                    if (err instanceof UserError) {
                        if (['NO_RESULT', 'INVALID_PAGE_INDEX', 'UNKNOWN_TAG'].includes(err.code)) {
                            startCooldown();
                        }
                        interaction[
                            interaction.deferred || interaction.replied ? 'editReply' : 'reply'
                        ](err.message);
                        return;
                    }
                    interaction[
                        interaction.deferred || interaction.replied ? 'editReply' : 'reply'
                    ](
                        `An unexpected error occurred while executing the command \`${interaction.commandName}\`: \`\`\`${err.message}\`\`\``
                    );
                }
            }
        });
    }

    cloneCommandData(c: Command, rep: string) {
        const C = c.clone();
        const clone = C.data.clone;
        delete C.data.clone;
        C.data = JSON.parse(
            JSON.stringify(C.data).replace(new RegExp(clone.keyword, 'g'), rep)
        ) as Command['data'];
        return C;
    }

    compareCommandData(c1: Object, c2: Object) {
        const keys1 = Object.keys(c1);
        const keys2 = Object.keys(c2);
        if (keys1.length !== keys2.length) return false;
        for (const key of keys1) {
            const val1 = c1[key];
            const val2 = c2[key];
            const areObjects = [val1, val2].every(
                object => object != null && typeof object === 'object'
            );
            if (
                (areObjects && !this.compareCommandData(val1, val2)) ||
                (!areObjects && val1 !== val2)
            ) {
                return false;
            }
        }
        return true;
    }

    async loadCommands() {
        try {
            let allCommands: Command[] = [];
            const commandFolders = readdirSync(`${__dirname}/../commands/`);
            for (const folder of commandFolders) {
                const commandFiles = readdirSync(`${__dirname}/../commands/${folder}`).filter(
                    file => file.endsWith('.js') || file.endsWith('.ts')
                );
                const commands = await Promise.all(
                    commandFiles.map(async file => {
                        const commandData = await import(
                            `${__dirname}/../commands/${folder}/${file.slice(0, -3)}`
                        );
                        const c = new commandData.default(this.client) as Command;
                        if (c.data.clone) {
                            const cloned = c.data.clone.clones.map(clone =>
                                this.cloneCommandData(c, clone)
                            );
                            return cloned;
                        }
                        return [c];
                    })
                );
                this.client.categories.set(
                    folder,
                    [].concat(...commands).map(c => c.data.name)
                );
                allCommands = allCommands.concat(...commands);
            }
            const existingCommands =
                ENVIRONMENT === 'development'
                    ? await (
                          await this.client.guilds.fetch(DEVELOPMENT_GUILD as Snowflake)
                      ).commands.fetch()
                    : await this.client.application?.commands.fetch();
            let updatedCommands = new Collection<Snowflake, ApplicationCommand>();
            if (!existingCommands.size) {
                updatedCommands =
                    ENVIRONMENT === 'development'
                        ? await this.client.application?.commands.set(allCommands.map(c => c.data), DEVELOPMENT_GUILD as Snowflake)
                        : await this.client.application?.commands.set(allCommands.map(c => c.data));
            } else {
                updatedCommands = existingCommands;
                allCommands.forEach(async cmd => {
                    const cmddb = existingCommands.find(c => c.name === cmd.data.name);
                    if (!cmddb) {
                        const nw = await (ENVIRONMENT === 'development'
                            ? (
                                  await this.client.guilds.fetch(DEVELOPMENT_GUILD as Snowflake)
                              ).commands
                            : this.client.application?.commands
                        ).create(cmd.data);
                        updatedCommands.set(nw.id, nw);
                    } else {
                        const common = Object.keys(cmd.data).filter(k => k in cmddb);
                        const o1: Record<string, any> = {},
                            o2: Record<string, any> = {};
                        common.forEach(k => {
                            o1[k] = cmd.data[k];
                            o2[k] = cmddb[k];
                        });
                        if (!this.compareCommandData(o1, o2)) {
                            const up = await (ENVIRONMENT === 'development'
                                ? (
                                      await this.client.guilds.fetch(DEVELOPMENT_GUILD as Snowflake)
                                  ).commands
                                : this.client.application?.commands
                            ).edit(cmddb, cmd.data);
                            updatedCommands.set(up.id, up);
                        }
                    }
                });
            }
            allCommands.forEach(cc => {
                const cmd = updatedCommands.find(dc => dc.name === cc.data.name);
                if (!cmd) return;
                this.client.commands.set(cmd.name, cc);
            });
            this.client.logger.info(
                `[COMMANDS] Loaded ${this.client.commands.size} commands successfully.`
            );
        } catch (err) {
            this.client.logger.error(err);
        }
    }
}
