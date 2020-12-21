import { AkairoClient, InhibitorHandler, ListenerHandler } from 'discord-akairo';
import { TextChannel, DMChannel, Intents } from 'discord.js';
import Command from './Command';
import Inhibitor from './Inhibitor';
import Listener from './Listener';
import CommandHandler from './CommandHandler';
import { NhentaiAPI } from '@inari/struct/nhentai';
import * as DB from '@inari/struct/db';
import Logger from '@inari/utils/logger';
import Embeds from '@inari/utils/embeds';
import { InariUtil } from '@inari/utils/utils';
import config from '@inari/config';
import NekosLifeAPI from 'nekos.life';
import { fork, ChildProcess } from 'child_process';
const { DISCORD_TOKEN } = process.env;
const intent = Intents.FLAGS;

export class InariClient extends AkairoClient {
    constructor(...options: ConstructorParameters<typeof AkairoClient>) {
        super(
            options[0],
            Object.assign({}, options[1], {
                shards: 'auto',
                messageCacheMaxSize: 10,
                messageCacheLifetime: 10000,
                messageSweepInterval: 30000,
                messageEditHistoryMaxSize: 3,
            })
        );
    }

    config = config;
    commandHandler = new CommandHandler(this, {
        directory: `${__dirname}/../../commands/`,
        prefix: async message => {
            if (!message.guild) return [...config.settings.prefix.nsfw, config.settings.prefix.sfw];
            if (!this.commandHandler.splitPrefix || !this.commandHandler.splitPrefix.has(message.guild.id)) await this.commandHandler.updatePrefix(message);
            let { nsfw, sfw } = this.commandHandler.splitPrefix.get(message.guild.id);
            return [...nsfw, ...sfw];
        },
        classToHandle: Command,
        allowMention: true,
        defaultCooldown: 30000,
        blockBots: true,
        automateCategories: true,
        commandUtil: true,
    });
    inhibitorHandler = new InhibitorHandler(this, {
        directory: `${__dirname}/../../inhibitors/`,
        classToHandle: Inhibitor,
    });
    listenerHandler = new ListenerHandler(this, {
        directory: `${__dirname}/../../listeners/`,
        classToHandle: Listener,
    });

    nhentai = new NhentaiAPI();
    db = DB;
    util: InariUtil = new InariUtil(this);
    embeds = Embeds;
    logger = Logger;
    nekoslife = new NekosLifeAPI();

    notifier: ChildProcess;
    private setup(): void {
        /* this.notifier = fork(`${__dirname}/../../submodules/notifier/index`, [
            '-r',
            'tsconfig-paths/register',
        ]).on(
            'message',
            async (m: {
                tagId: string;
                type: string;
                name: string;
                channel: string;
                user: string;
                action: string;
            }) => {
                let adding = m.action === 'add';
                const channel = this.channels.cache.get(m.channel) as TextChannel | DMChannel;
                const user = this.users.cache.get(m.user);
                channel
                    .send(
                        this.embeds
                            .info(
                                (adding
                                    ? `Started following ${m.type} \`${m.name}\`.`
                                    : `Stopped following ${m.type} \`${m.name}\`.`) +
                                    '\nIt may take a while to update.'
                            )
                            .setFooter(user.tag, user.displayAvatarURL())
                    )
                    .then(message => message.delete({ timeout: 5000 }));
            }
        ); */
        this.commandHandler
            .useInhibitorHandler(this.inhibitorHandler)
            .useListenerHandler(this.listenerHandler)
            .loadAll();

        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            inhibitorHandler: this.inhibitorHandler,
            listenerHandler: this.listenerHandler,
            process: process,
        });

        this.inhibitorHandler.loadAll();
        this.listenerHandler.loadAll();
    }

    async start(): Promise<void> {
        this.setup();
        await this.db.init();
        await super.login(DISCORD_TOKEN);
        const owner = (await super.fetchApplication()).owner!.id;
        this.ownerID = this.commandHandler.ignoreCooldown = owner;
        this.logger.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`);
    }
}
