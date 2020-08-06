import mongoose from 'mongoose';
import { Logger } from './logger';

export class Mongoose {
    static async init() {
        mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            autoIndex: true,
            useUnifiedTopology: true
        });
        mongoose.connection.on('connected', () => { Logger.info('[DATABASE] Connected to MongoDB successfully!'); });
        mongoose.connection.on('err', err => { Logger.error(`[DATABASE] Error connecting mongoose: ${err}`); });
        mongoose.connection.on('disconnected', () => { Logger.info('[DATABASE] Mongoose has disconnected from db!'); });
    }
};