import { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } from 'discord-akairo';
import { nhentaiClient } from '../nhentai/index';
import * as DB from '../db/index';
import Logger from '@nhentai/utils/logger';
import Embeds from '@nhentai/utils/embeds';
import { NhentaiUtil } from '@nhentai/utils/utils';
import { Mongoose } from '@nhentai/utils/mongoose';
import NekosLifeAPI from 'nekos.life';
import { fork, ChildProcess } from 'child_process';
import { TextChannel } from 'discord.js';
import { DMChannel } from 'discord.js';
const { DISCORD_TOKEN, PREFIX } = process.env;

export class NhentaiClient extends AkairoClient {
    commandHandler = new CommandHandler(this, {
        directory: `${__dirname}/../../commands/`,
        prefix: async message => {
            if (message.guild) {
                const prefix = (await DB.Server.prefix(message, 'list')).map(pfx => pfx.id);
                prefix.push(PREFIX);
                return prefix;
            }
            return PREFIX;
        },
        allowMention: true,
        defaultCooldown: 30000,
        blockBots: true,
        automateCategories: true,
        commandUtil: true,
    });
    inhibitorHandler = new InhibitorHandler(this, {
        directory: `${__dirname}/../../inhibitors/`,
    });
    listenerHandler = new ListenerHandler(this, {
        directory: `${__dirname}/../../listeners/`,
    });

    nhentai = new nhentaiClient();
    db = DB;
    util: NhentaiUtil = new NhentaiUtil(this);
    embeds = Embeds;
    logger = Logger;
    nekoslife = new NekosLifeAPI();

    notifier: ChildProcess;
    private setup(): void {
        this.notifier = fork(`${__dirname}/../../submodules/notifier/index`, [
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
                        this.embeds.info(
                            (adding
                                ? `Started following ${m.type} \`${m.name}\`.`
                                : `Stopped following ${m.type} \`${m.name}\`.`) +
                                '\nIt may take a while to update.'
                        ).setFooter(user.tag, user.displayAvatarURL())
                    )
                    .then(message => message.delete({ timeout: 5000 }));
            }
        );
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
        await Mongoose.init();
        await super.login(DISCORD_TOKEN);
        const owner = (await super.fetchApplication()).owner!.id;
        this.ownerID = this.commandHandler.ignoreCooldown = owner;
        this.logger.info(`[READY] Fetched application profile. Setting owner ID to ${owner}.`);
    }
}
