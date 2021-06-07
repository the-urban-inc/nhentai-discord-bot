import { AkairoClient, ListenerHandler, InhibitorHandler } from 'discord-akairo';
import { TextChannel, DMChannel, Guild } from 'discord.js';
import { Command, CommandHandler, Embeds, Inhibitor, Listener, Logger, Util } from './index';
import config from '@config';
import { Client as JASMRAPI } from '@api/jasmr';
import { Client as NhentaiAPI } from '@api/nhentai';
import { Client as FakkuAPI } from '@api/fakku';
import { Client as ImageAPI } from '@api/images';
import * as DB from '@database/index';
import { fork, ChildProcess } from 'child_process';
import { FfmpegCommand } from 'fluent-ffmpeg';
const { DISCORD_TOKEN } = process.env;

export class Client extends AkairoClient {
    public config: typeof config;
    public db: typeof DB;
    public embeds: Embeds;
    public util: Util;
    public logger: Logger;
    public commandHandler: CommandHandler;
    public listenerHandler: ListenerHandler;
    public inhibitorHandler: InhibitorHandler;
    public jasmr: JASMRAPI;
    public nhentai: NhentaiAPI;
    public fakku: FakkuAPI;
    public images: ImageAPI;
    public notifier: ChildProcess;
    public current: Map<
        Guild['id'],
        {
            title: string;
            url: string;
            duration: number;
        }
    >;
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
        this.config = config;
        this.db = DB;
        this.embeds = new Embeds(this);
        this.util = new Util(this);
        this.logger = new Logger(this);
        this.commandHandler = new CommandHandler(this, {
            directory: `${__dirname}/../commands/`,
            prefix: async message => {
                if (!message.guild)
                    return [...config.settings.prefix.nsfw, ...config.settings.prefix.sfw];
                if (
                    !this.commandHandler.splitPrefix ||
                    !this.commandHandler.splitPrefix.has(message.guild.id)
                )
                    await this.commandHandler.updatePrefix(message);
                let { nsfw, sfw } = this.commandHandler.splitPrefix.get(message.guild.id);
                return [...nsfw, ...sfw];
            },
            classToHandle: Command,
            allowMention: true,
            blockBots: true,
            automateCategories: true,
            commandUtil: true,
        }).loadAll();
        this.inhibitorHandler = new InhibitorHandler(this, {
            directory: `${__dirname}/../inhibitors/`,
            classToHandle: Inhibitor,
        });
        this.listenerHandler = new ListenerHandler(this, {
            directory: `${__dirname}/../listeners/`,
            classToHandle: Listener,
        });
        this.commandHandler
            .useInhibitorHandler(this.inhibitorHandler)
            .useListenerHandler(this.listenerHandler);
        this.jasmr = new JASMRAPI();
        this.nhentai = new NhentaiAPI();
        this.fakku = new FakkuAPI();
        this.images = new ImageAPI();
        this.current = new Map<
            Guild['id'],
            {
                title: string;
                url: string;
                duration: number;
            }
        >();
    }

    async start(): Promise<void> {
        this.notifier = fork(`${__dirname}/../submodules/notifier/index`, [
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
                            .setFooter(user!.tag, user!.displayAvatarURL())
                    )
                    .then(message => message.delete({ timeout: 5000 }));
            }
        );
        this.inhibitorHandler.loadAll();
        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            inhibitorHandler: this.inhibitorHandler,
            listenerHandler: this.listenerHandler,
            process: process,
        });
        this.listenerHandler.loadAll();
        await this.db.init();
        await this.fakku.setup(); // Comment this line out if you don't want to scrape Fakku magazine page everytime the bot starts up
        await super.login(DISCORD_TOKEN);
        const owner = (await super.fetchApplication()).owner!.id;
        this.ownerID = this.commandHandler.ignoreCooldown = owner;
        this.logger.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`);
    }
}
