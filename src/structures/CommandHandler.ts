import { Client } from './Client';
import { Command } from './Command';
import { UserError } from './Error';
import {
    ApplicationCommand,
    ApplicationCommandManager,
    Collection,
    CommandInteraction,
    Interaction,
    InteractionType,
    MessageFlags,
    Snowflake,
    TextChannel,
    ThreadChannel,
} from 'discord.js';
import fg from 'fast-glob';
import { Server } from '@database/models';
import axios from 'axios';
import { performance } from 'perf_hooks';

export class CommandHandler extends ApplicationCommandManager {
    client: Client;

    constructor(client: Client) {
        super(client as Client<true>);
        this.client.on('interactionCreate', this.handleInteraction.bind(this));
    }

    private async handleInteraction(interaction: Interaction) {
        if (
            !('isCommand' in interaction) ||
            (!interaction.isCommand() &&
                !interaction.isAnySelectMenu() &&
                !interaction.isAutocomplete())
        )
            return;
        if (
            !(interaction.channel instanceof TextChannel) &&
            !(interaction.channel instanceof ThreadChannel)
        )
            return;
        if (
            ![
                InteractionType.ApplicationCommand,
                InteractionType.ApplicationCommandAutocomplete,
            ].includes(interaction.type as InteractionType)
        )
            return;

        if (!this.client.commands.has((interaction as any).commandName)) return;

        let startCooldown = () => {};

        try {
            const { commands, cooldowns } = this.client;
            const command = commands.get((interaction as any).commandName) as Command;

            if (interaction.isAutocomplete()) {
                const acStart = performance.now();
                await command.autocomplete(interaction as any);
                const acElapsed = Math.round(performance.now() - acStart);
                this.client.logger.info(
                    `[COMMAND][autocomplete] ${interaction.user.tag} (ID: ${
                        interaction.user.id
                    }) => ${(interaction as any).commandName} completed in ${acElapsed}ms`
                );
                return;
            }
            let server = await Server.findOne({ serverID: interaction.guild.id }).exec();
            if (!server) {
                server = await new Server({
                    serverID: interaction.guild.id,
                    settings: { private: false },
                }).save();
            }

            const privateCommand = server.settings.private;
            const deferOpts: any = {};
            if ((interaction as any).isCommand && (interaction as any).isCommand()) {
                const cmdInteraction = interaction as unknown as CommandInteraction;
                const privateOpt =
                    (cmdInteraction.options.get('private')?.value as boolean) ?? privateCommand;
                if (privateOpt) deferOpts.flags = MessageFlags.Ephemeral;
                deferOpts.withResponse = !privateOpt;
            }
            await interaction.deferReply(deferOpts);

            const { name, permissions, cooldown, nsfw, owner } = command.data;

            if (owner && interaction.user.id !== this.client.ownerID) {
                throw new UserError('OWNER_ONLY');
            }

            const channel = interaction.channel as TextChannel | ThreadChannel;

            const channelIsNsfw =
                channel instanceof ThreadChannel
                    ? (channel.parent instanceof TextChannel ? channel.parent.nsfw : false)
                    : (channel as TextChannel).nsfw;

            if (!channelIsNsfw && nsfw) {
                throw new UserError(
                    'NSFW_COMMAND_IN_SFW_CHANNEL',
                    (interaction as any).commandName
                );
            }

            if (permissions) {
                const userPerms = channel.permissionsFor(interaction.user);
                if (!userPerms || !userPerms.has(permissions)) {
                    const missing = permissions
                        .filter((p: any) => !userPerms.has(p))
                        .map((p: any) => this.client.util.resolvePerm(p));
                    throw new UserError('MISSING_PERMISSIONS', missing);
                }
            }

            const cooldownAmount = cooldown ?? 0;

            if (cooldownAmount > 0) {
                if (!cooldowns.has(name)) cooldowns.set(name, new Collection());

                const now = Date.now();
                const timestamps = cooldowns.get(name)!;

                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                    if (now < expirationTime) {
                        const timeLeft = expirationTime - now;
                        throw new UserError('COOLDOWN', +(timeLeft / 1000).toFixed(2));
                    }
                }
            }

            startCooldown = () => {
                if (cooldownAmount > 0) {
                    const now = Date.now();
                    const timestamps = cooldowns.get(name)!;
                    timestamps.set(interaction.user.id, now);
                    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
                }
            };

            const execStart = performance.now();
            try {
                await (command as any).exec(interaction as any);

                const execElapsed = Math.round(performance.now() - execStart);
                this.client.logger.info(
                    `[COMMAND] ${interaction.user.tag} (ID: ${interaction.user.id}) => ${name} completed in ${execElapsed}ms`
                );
                startCooldown();
            } catch (err) {
                const failedElapsed = Math.round(performance.now() - execStart);
                this.client.logger.info(
                    `[COMMAND] ${interaction.user.tag} (ID: ${interaction.user.id}) => ${
                        (interaction as any).commandName
                    } failed after ${failedElapsed}ms`
                );
                throw err;
            }
        } catch (err: any) {
            const isAxiosError = axios.isAxiosError(err);
            if (!isAxiosError) {
                if (err.code === 10062 || err.code === 40060)
                    this.client.logger.error(
                        `${(interaction as any)?.commandName} => ${err.message}`
                    );
                else this.client.logger.error(err instanceof UserError ? err.code : err);
            }
            if ((interaction as any).isAutocomplete && (interaction as any).isAutocomplete())
                return;
            const type =
                (interaction as any).deferred || (interaction as any).replied
                    ? 'editReply'
                    : 'reply';
            if (err instanceof UserError) {
                if (['NO_RESULT', 'INVALID_PAGE_INDEX', 'UNKNOWN_TAG'].includes(err.code))
                    startCooldown();
                return (interaction as any)[type]({
                    content: err.message,
                    embeds: [],
                    components: [],
                });
            }
            return (interaction as any)[type]({
                content: `An unexpected error occurred while executing the command \`${
                    (interaction as any).commandName
                }\`: \`\`\`${err.message}\`\`\``,
                embeds: [],
                components: [],
            });
        }
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
            const commandFiles = await fg([`${__dirname}/../commands/*/*.{js,ts}`]);
            const categories = new Collection<string, string[]>();
            const commands = await Promise.all(
                commandFiles.map(async file => {
                    const commandData = await import(file.slice(0, -3));
                    const c = new commandData.default(this.client);
                    const folder = file.split('/').slice(-2, -1)[0];
                    if (!categories.has(folder)) categories.set(folder, []);
                    categories.get(folder)?.push(c.data.name);
                    if ((c as Command).data.clone) {
                        const cloned = c.data.clone.clones.map(clone =>
                            this.cloneCommandData(c, clone)
                        );
                        return cloned;
                    }
                    return [c];
                })
            );
            this.client.categories = categories;
            allCommands = allCommands.concat(...commands);
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
