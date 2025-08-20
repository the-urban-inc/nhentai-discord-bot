import { Client } from './Client';
import { Command } from './Command';
import { UserError } from './Error';
import {
    ApplicationCommand,
    ApplicationCommandManager,
    Collection,
    CommandInteraction,
    ContextMenuCommandInteraction,
    InteractionType,
    MessageFlags,
    Snowflake,
    TextChannel,
    ThreadChannel,
} from 'discord.js';
import { readdirSync } from 'fs';
import { ContextMenuCommand } from '@structures';
import { Server } from '@database/models';
import axios from 'axios';

let startCooldown: () => void;
export class CommandHandler extends ApplicationCommandManager {
    client: Client;
    constructor(client: Client) {
        super(client as Client<true>);
        this.client.on('interactionCreate', async interaction => {
            if (
                !interaction.isCommand() &&
                !interaction.isAnySelectMenu() &&
                !interaction.isAutocomplete()
            )
                return;
            if (
                !(interaction.channel instanceof TextChannel) ||
                interaction.channel instanceof ThreadChannel
            )
                return;
            if (
                (interaction.type == InteractionType.ApplicationCommand ||
                    interaction.type == InteractionType.ApplicationCommandAutocomplete) &&
                this.client.commands.has(interaction.commandName)
            ) {
                try {
                    const { commands, cooldowns } = this.client;
                    const command = commands.get(interaction.commandName);
                    if (interaction.isAutocomplete()) {
                        return await (command as Command).autocomplete(interaction);
                    }
                    let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
                    if (!server) {
                        server = await new Server({
                            serverID: interaction.guild.id,
                            settings: { private: false },
                        }).save();
                    }
                    const privateCommand = server.settings.private;
                    await interaction.deferReply({
                        ...(((interaction.options.get('private')?.value as boolean) ??
                            privateCommand) && { flags: MessageFlags.Ephemeral }),
                        withResponse: !(
                            (interaction.options.get('private')?.value as boolean) ?? privateCommand
                        ),
                    });
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

                    interaction.isCommand()
                        ? await (command as Command).exec(interaction as CommandInteraction)
                        : await (command as ContextMenuCommand).exec(
                              interaction as ContextMenuCommandInteraction
                          );

                    startCooldown();
                } catch (err) {
                    if (axios.isAxiosError(err) || err.code === 10062) return this.client.logger.error(`${interaction.commandName} => ${err.message}`);
                    else this.client.logger.error(err instanceof UserError ? err.code : err);
                    if (interaction.isAutocomplete()) return;
                    const type =
                        interaction.deferred || interaction.replied ? 'editReply' : 'reply';
                    if (err instanceof UserError) {
                        if (['NO_RESULT', 'INVALID_PAGE_INDEX', 'UNKNOWN_TAG'].includes(err.code)) {
                            startCooldown();
                        }
                        interaction[type]({ content: err.message, embeds: [], components: [] });
                        return;
                    }
                    interaction[type]({
                        content: `An unexpected error occurred while executing the command \`${interaction.commandName}\`: \`\`\`${err.message}\`\`\``,
                        embeds: [],
                        components: [],
                    });
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
                        const c = new commandData.default(this.client);
                        if ((c as Command).data.clone) {
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
            let updatedCommands = new Collection<Snowflake, ApplicationCommand>();
            updatedCommands = await this.client.application?.commands.set(
                allCommands.map(c => c.data)
            );
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
