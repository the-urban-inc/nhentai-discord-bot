import { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } from 'discord-akairo';
import { MessageEmbed } from 'discord.js';
import path from 'path';
import { nhentaiClient } from './nhentai/index';
import RichDisplay from '../utils/richDisplay';
import fetch from 'node-fetch';
import NekosLifeAPI from 'nekos.life';
// import LolisLifeAPI from 'lolis.life';
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

    logger = require('../utils/logger');
    mongoose = require('../utils/mongoose');

    embeds = (method: string, text = 'An unexpected error has occurred.') => {
        if (method === 'display') return new RichDisplay(this);
        return new MessageEmbed()
            .setColor(method === 'info' ? '#f0f0f0' : '#ff0000')
            .setDescription(text)
    }

    nhentai = new nhentaiClient();

    nekoslife = new NekosLifeAPI();
    
    // lolislife = new LolisLifeAPI();

    nekobot = async (type: string) => {
        return fetch(`https://nekobot.xyz/api/image?type=${type}`)
            .then(res => res.json())
            .then(data => data.message)
    }

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
        await this.mongoose.init();
        await this.login(DISCORD_TOKEN);
        // fill in the owner details
        let owner = (await this.fetchApplication()).owner.id;
        this.ownerID = this.commandHandler.ignoreCooldown = owner;
        this.logger.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`)
    }
};