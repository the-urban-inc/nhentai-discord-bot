import { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } from 'discord-akairo';
import path from 'path';
import { nhentaiClient } from './nhentai/index';
import { Logger } from '@nhentai/utils/logger';
import { Mongoose } from '@nhentai/utils/mongoose';
import NekosLifeAPI from 'nekos.life';
import { fork, ChildProcess } from 'child_process';
const { DISCORD_TOKEN, PREFIX } = process.env;

export class NhentaiClient extends AkairoClient {

    constructor() {
        super();
    }

    commandHandler = new CommandHandler(this, {
        directory: path.join(__dirname, '..', 'commands'),
        prefix: PREFIX,
        allowMention: true,
        defaultCooldown: 3000,
        blockBots: true,
        automateCategories: true,
    });
    inhibitorHandler = new InhibitorHandler(this, { directory: path.join(__dirname, '..', 'inhibitors') });
    listenerHandler = new ListenerHandler(this, { directory: path.join(__dirname, '..', 'listeners') });

    nhentai = new nhentaiClient();

    nekoslife = new NekosLifeAPI();

    notifier: ChildProcess
    setup() {
        this.notifier = fork(
            `${__dirname}/../submodules/notifier/index`,
            [
                "-r", "tsconfig-paths/register",
                "-r", "ts-node/register"
            ]
        );
        this.commandHandler
            .useInhibitorHandler(this.inhibitorHandler)
            .useListenerHandler(this.listenerHandler)
            .loadAll();

        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            inhibitorHandler: this.inhibitorHandler,
            listenerHandler: this.listenerHandler,
            process: process
        });

        this.inhibitorHandler.loadAll();
        this.listenerHandler.loadAll();
    }

    async start() {
        this.setup();
        await Mongoose.init();
        await this.login(DISCORD_TOKEN);
        // fill in the owner details
        let owner = (await this.fetchApplication()).owner.id;
        this.ownerID = this.commandHandler.ignoreCooldown = owner;
        Logger.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`)
    }
};