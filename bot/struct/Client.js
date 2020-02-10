const { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const path = require('path');
const nClient = require('./nhentai/index');
const RichDisplay = require('../utils/richDisplay');
const fetch = require('node-fetch');
const NekosLifeAPI = require('nekos.life');
const LolisLifeAPI = require('lolis.life');
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

        this.icon = 'https://static.nhentai.net/img/logo.650c98bbb08e.svg';

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