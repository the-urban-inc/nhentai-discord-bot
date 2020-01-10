const { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } = require('discord-akairo');
const path = require('path');
const nClient = require('./nhentai/index');
const { DISCORD_TOKEN, PREFIX, OWNER } = process.env;

module.exports = class Client extends AkairoClient {
    constructor() {
        super({ownerID: OWNER}, {
			disableEveryone: true,
			disabledEvents: ['TYPING_START']
        });

        this.commandHandler = new CommandHandler(this, {
            directory: path.join(__dirname, '..', 'commands'),
            aliasReplacement: /-/g,
            prefix: PREFIX,
            allowMention: true,
            defaultCooldown: 3000,
            ignoreCooldownID: OWNER,
            blockBots: true,
            automateCategories: true,
        });

        this.inhibitorHandler = new InhibitorHandler(this, { directory: path.join(__dirname, '..', 'inhibitors') });
        this.listenerHandler = new ListenerHandler(this, { directory: path.join(__dirname, '..', 'listeners') });
        
        this.logger = require('../utils/logger');
        this.mongoose = require('../utils/mongoose');
        this.extensions = require('../utils/extensions');
        this.embeds = require('../utils/embeds');
        this.nhentai = new nClient();

        this.icon = 'https://pbs.twimg.com/profile_images/733172726731415552/8P68F-_I_400x400.jpg';

        this.flag = {
            'chinese': ':flag_cn:',
            'english': ':flag_gb:',
            'japanese': ':flag_jp:'
        };

        this.setup();
    }

    setup() {
        this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
        this.commandHandler.useListenerHandler(this.listenerHandler);

        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            inhibitorHandler: this.inhibitorHandler,
            listenerHandler: this.listenerHandler,
            process: process
        });

        this.commandHandler.loadAll();
        this.inhibitorHandler.loadAll();
        this.listenerHandler.loadAll();
    }

    async start() { 
        await this.mongoose.init();
        await this.login(DISCORD_TOKEN); 
    }
};