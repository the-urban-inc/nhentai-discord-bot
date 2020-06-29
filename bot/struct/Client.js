const { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const path = require('path');
const nClient = require('./nhentai/index');
const RichDisplay = require('../utils/richDisplay');
const log = require('../utils/logger');
const fetch = require('node-fetch');
const NekosLifeAPI = require('nekos.life');
const LolisLifeAPI = require('lolis.life');
const { fork } = require('child_process');
const { DISCORD_TOKEN, PREFIX } = process.env;

module.exports = class Client extends AkairoClient {
    constructor() {
        super({}, {
			disableEveryone: true,
			disabledEvents: ['TYPING_START']
        });

        this.inhibitorHandler = new InhibitorHandler(this, { directory: path.join(__dirname, '..', 'inhibitors') });
        this.listenerHandler = new ListenerHandler(this, { directory: path.join(__dirname, '..', 'listeners') });
        
        this.logger = require('../utils/logger');
        this.mongoose = require('../utils/mongoose');
        this.extensions = require('../utils/extensions');

        this.embeds = (method, text = 'An unexpected error has occurred.') => {
            if (method === 'display') return new RichDisplay(this);
            return new MessageEmbed()
			    .setColor(method === 'info' ? '#f0f0f0' : '#ff0000')
			    .setDescription(text)
        };
        
        this.permissions = {
            'SEND_MESSAGES': 'Send Messages',
            'MANAGE_MESSAGES': 'Manage Messages',
            'EMBED_LINKS': 'Embed Links',
            'ATTACH_FILES': 'Attach Files',
            'READ_MESSAGE_HISTORY': 'Read Message History',
            'USE_EXTERNAL_EMOJIS': 'Use External Emojis',
            'ADD_REACTIONS': 'Add Reactions'
        };

        this.nhentai = new nClient();

        this.icon = 'https://i.imgur.com/7WX63G3.png';

        this.flag = {
            'chinese': ':flag_cn:',
            'english': ':flag_gb:',
            'japanese': ':flag_jp:'
        };

        this.nekoslife = new NekosLifeAPI();
        this.nltags = {
            'anal': ['anal'],
            'avatar': ['avatar'],
            'blowjob': ['bJ', 'blowJob'],
            'boobs': ['boobs', 'tits'],
            'cum': ['cumsluts', 'cumArts'],
            'ero': ['ero'],
            'feet': ['feet', 'feetGif', 'eroFeet'],
            'femdom': ['femdom'],
            'futa': ['futanari'],
            'hentai': ['classic', 'randomHentaiGif'],
            'holo': ['holo', 'holoEro'],
            'kemonomimi': ['kemonomimi', 'eroKemonomimi'],
            'keta': ['keta'],
            'kitsune': ['kitsune'],
            'kuni': ['kuni'],
            'neko': ['neko', 'eroNeko', 'nekoGif'],
            'pussy': ['pussy', 'pussyWankGif', 'pussyArt', 'pussyGif'],
            'solo': ['girlSolo', 'girlSoloGif'],
            'trap': ['trap'],
            'yuri': ['yuri', 'eroYuri', 'lesbian']
        };
        this.lolislife = new LolisLifeAPI();
        this.nekobot = function(type) {
            return fetch(`https://nekobot.xyz/api/image?type=${type}`)
                .then(res => res.json())
                .then(data => data.message)
        }
        this.nbtags = {
            'anal': ['hanal'],
            'ass': ['hass'],
            'hentai': ['hentai'],
            'holo': ['holo'],
            'kemonomimi': ['kemonomimi'],
            'kitsune': ['hkitsune'],
            'midriff': ['hmidriff'],
            'neko': ['neko', 'hneko'],
            'thigh': ['hthigh']
        };
        this.setup();
    }

    setup() {
        this.notifier = fork(
            `${__dirname}/../submodules/notifier/index`,
            [
                "-r", "tsconfig-paths/register",
                "-r", "ts-node/register"
            ]
        );
        this.commandHandler = new CommandHandler(this, {
            directory: path.join(__dirname, '..', 'commands'),
            aliasReplacement: /-/g,
            prefix: PREFIX,
            allowMention: true,
            defaultCooldown: 3000,
            blockBots: true,
            automateCategories: true,
        })
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
        await this.mongoose.init();
        await this.login(DISCORD_TOKEN); 
        // fill in the owner details
        let owner = (await this.fetchApplication()).owner.id;
        this.ownerID = this.commandHandler.ignoreCooldown = owner;
        log.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`)
    }
};