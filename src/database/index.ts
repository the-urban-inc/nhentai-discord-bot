import mongoose from 'mongoose';
import { Logger } from '@structures';

export async function init() {
    const log = new Logger();
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        autoIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    });
    mongoose.connection
        .on('connected', () => log.info(`[DATABASE] Connected to MongoDB successfully!`))
        .on('disconnected', () => log.warn(`[DATABASE] Disconnected.`))
        .on('err', e => log.error(`[DATABASE] Connection error : ${e}`));
}

export * as Server from './settings/server';
export * as User from './settings/user';
export * as XP from './xp/xp';
