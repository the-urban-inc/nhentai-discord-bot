import { Command, CommandHandler, ContextMenuCommand, Embeds, Notifier, MusicSubscription, Paginator, Util, Logger } from './index';
import { Client as C, ClientOptions, Collection, Snowflake, User, Options } from 'discord.js';
import { Database } from '@database/index';
import { Client as JASMRAPI } from '@api/jasmr';
import { Client as NhentaiAPI } from '@api/nhentai';
import { Client as ImageAPI } from '@api/images';
const { DISCORD_TOKEN } = process.env;

export class Client extends C {
    ownerID: string;
    commands: Collection<string, Command | ContextMenuCommand>;
    categories: Collection<string, string[]>;
    cooldowns: Collection<string, Collection<User['id'], number>>;
    paginators: Collection<string, Paginator>;
    warned: Set<User['id']>;
    commandHandler: CommandHandler;
    db: Database;
    jasmr: JASMRAPI;
    nhentai: NhentaiAPI;
    images: ImageAPI;
    embeds: Embeds;
    notifier: Notifier;
    util: Util;
    logger: Logger;
    subscriptions: Collection<Snowflake, MusicSubscription>;
    tags: Collection<string, string[]>;
    asmrTags: string[];

    constructor(options?: ClientOptions) {
        super({
            ...options,
            intents: [
                'GUILDS',
                'DIRECT_MESSAGES',
                'GUILD_MESSAGES',
                'GUILD_VOICE_STATES',
            ],
            shards: 'auto',
            makeCache: Options.cacheWithLimits({
                MessageManager: 0,
                GuildBanManager: 0,
                GuildInviteManager: 0,
                ThreadManager: 0,
                PresenceManager: 0,
                ReactionManager: 0,
                ReactionUserManager: 0
            })
        });
        this.commands = new Collection<string, Command | ContextMenuCommand>();
        this.categories = new Collection<string, string[]>();
        this.cooldowns = new Collection<string, Collection<User['id'], number>>();
        this.paginators = new Collection<string, Paginator>();
        this.warned = new Set<User['id']>();
        this.commandHandler = new CommandHandler(this);
        this.db = new Database(this);
        this.embeds = new Embeds(this);
        this.notifier = new Notifier(this);
        this.util = new Util(this);
        this.logger = new Logger(this);
        this.jasmr = new JASMRAPI();
        this.nhentai = new NhentaiAPI();
        this.images = new ImageAPI();
        this.subscriptions = new Collection<Snowflake, MusicSubscription>();
        this.tags = new Collection<string, string[]>();
        this.asmrTags = [];
    }

    async start(): Promise<void> {
        await super.login(DISCORD_TOKEN);
    }
}
