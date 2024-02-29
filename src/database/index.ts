import mongoose from 'mongoose';
import { Server } from './settings/server';
import { User } from './settings/user';
import { XP } from './settings/xp';
import { Client, Logger } from '@structures';
import { Cache } from './cache';
const log = new Logger();

export class Database {
    client: Client;
    cache: Cache;
    server: Server;
    user: User;
    xp: XP;
    constructor(client: Client) {
        this.client = client;
        this.cache = new Cache();
        this.server = new Server();
        this.user = new User();
        this.xp = new XP();
    }
    async init() {
        await mongoose
            .connect(process.env.MONGODB_URI, {
                family: 4,
                useNewUrlParser: true,
                autoIndex: true,
                useUnifiedTopology: true,
                useFindAndModify: false,
                keepAlive: true,
                keepAliveInitialDelay: 300000,
                serverSelectionTimeoutMS: 5000,
            })
            .then(async () => {
                log.info(`[DATABASE] Connected to MongoDB successfully!`);
                if (!this.client.notifier.current) await this.client.notifier.start();
            })
            .catch(err => log.error(`[DATABASE] Connection error : ${err}`));
        mongoose.connection
            .on('reconnected', () => log.info(`[DATABASE] Reconnected.`))
            .on('disconnected', () => log.warn(`[DATABASE] Disconnected.`))
            .on('error', err => log.error(`[DATABASE] Connection error : ${err}`));
    }
}
