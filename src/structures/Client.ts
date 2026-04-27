import {
    Command,
    CommandHandler,
    ContextMenuCommand,
    Embeds,
    Notifier,
    GuildAudioPlayer,
    BasePaginator,
    Util,
    Logger,
} from './index';
import {
    Client as DiscordClient,
    ClientOptions,
    Collection,
    Snowflake,
    User,
    Options,
    IntentsBitField,
} from 'discord.js';
import { Database } from '@database/index';
import { Client as JASMRAPI } from '@api/jasmr';
import { Client as NhentaiAPI } from '@api/nhentai';
import { Client as ImageAPI } from '@api/images';
const { DISCORD_TOKEN } = process.env;

export class Client<Ready extends boolean = boolean> extends DiscordClient<Ready> {
    ownerID: string;
    commands: Collection<string, Command | ContextMenuCommand>;
    categories: Collection<string, string[]>;
    cooldowns: Collection<string, Collection<User['id'], number>>;
    paginators: Collection<bigint, BasePaginator>;
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
    subscriptions: Collection<Snowflake, GuildAudioPlayer>;
    tags: Collection<string, string[]>;
    asmrTags: string[];
    private asmrSetupPlayers = new WeakSet<GuildAudioPlayer>();

    setupASMRPlayer(player: GuildAudioPlayer): void {
        if (this.asmrSetupPlayers.has(player)) return;
        this.asmrSetupPlayers.add(player);

        player.on('start', (track) => {
            const embed = this.embeds
                .default()
                .setTitle('▶️\u2000Now Playing')
                .setDescription(
                    `[${track.title}](${track.url})\nDuration: \`${track.duration}\`\nTags: ${
                        track.tags.length ? track.tags.map(t => `\`${t.trim()}\``).join(' ') : 'N/A'
                    }`
                )
                .setThumbnail(track.imageURL)
                .setFooter({ text: `Circle: ${track.circle}` });
            player.textChannel.send({ embeds: [embed] }).catch(() => {});
        });

        player.on('finish', (track) => {
            const embed = this.embeds
                .default()
                .setTitle('⏹️\u2000Finished Playing')
                .setDescription(
                    `[${track.title}](${track.url})\nTags: ${
                        track.tags.length ? track.tags.map(t => `\`${t.trim()}\``).join(' ') : 'N/A'
                    }`
                )
                .setThumbnail(track.imageURL)
                .setFooter({ text: `Circle: ${track.circle}` });
            player.textChannel.send({ embeds: [embed] }).catch(() => {});
        });

        player.on('error', (track, error) => {
            this.logger.error(error);
            const name = track?.title ?? 'track';
            player.textChannel
                .send({ content: `❌\u2000Error playing **${name}**: ${error.message}` })
                .catch(() => {});
        });
    }

    constructor(options?: ClientOptions) {
        super({
            ...options,
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.DirectMessages,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.GuildVoiceStates,
            ],
            shards: 'auto',
            makeCache: Options.cacheWithLimits({
                MessageManager: 0,
                GuildBanManager: 0,
                GuildInviteManager: 0,
                ThreadManager: 0,
                PresenceManager: 0,
                ReactionManager: 0,
                ReactionUserManager: 0,
            }),
        });
        this.commands = new Collection<string, Command | ContextMenuCommand>();
        this.categories = new Collection<string, string[]>();
        this.cooldowns = new Collection<string, Collection<User['id'], number>>();
        this.paginators = new Collection<bigint, BasePaginator>();
        this.warned = new Set<User['id']>();
        this.commandHandler = new CommandHandler(this);
        this.db = new Database(this);
        this.embeds = new Embeds(this);
        this.notifier = new Notifier(this);
        this.util = new Util(this);
        this.logger = new Logger(this);
        this.jasmr = new JASMRAPI({ logger: this.logger });
        this.nhentai = new NhentaiAPI({ tagCacheDb: this.db.cache });
        this.images = new ImageAPI();
        this.subscriptions = new Collection<Snowflake, GuildAudioPlayer>();
        this.tags = new Collection<string, string[]>();
        this.asmrTags = [];
    }

    async start(): Promise<void> {
        await this.nhentai.initCdn();
        await super.login(DISCORD_TOKEN);
    }
}
