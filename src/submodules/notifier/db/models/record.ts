import { Schema, Document } from 'mongoose';
import type { User } from 'discord.js';

export interface IWatchRecord {
    // tag number
    id: number;
    // type
    type: string;
    // name
    name: string;
    // user
    user: User['id'][];
}

export interface WatchRecordDocument extends Document, IWatchRecord {
    id: number;
}

export const WatchRecord: Schema<IWatchRecord> = new Schema({
    id: Number,
    type: String,
    name: String,
    user: [String],
});
