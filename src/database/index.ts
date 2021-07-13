
import mongoose from 'mongoose';
import { Server } from './settings/server';
import { User } from './settings/user';
import { XP } from './settings/xp';
import { Client, Logger } from '@structures';
const log = new Logger();

export class Database {
    client: Client;
    server: Server;
    user: User;
    xp: XP;
    constructor(client: Client) {
        this.client = client;
        this.server = new Server();
        this.user = new User();
        this.xp = new XP();
    }
    async init() {
        mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            autoIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            serverSelectionTimeoutMS: 5000
        });
        mongoose.connection
            .on('connected', () => log.info(`[DATABASE] Connected to MongoDB successfully!`))
            .on('disconnected', () => log.warn(`[DATABASE] Disconnected.`))
            .on('err', e => log.error(`[DATABASE] Connection error : ${e}`));
    }
}