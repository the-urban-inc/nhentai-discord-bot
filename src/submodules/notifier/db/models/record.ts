import { Schema, Document } from 'mongoose';
import type { User } from 'discord.js';

export interface WatchRecord {
    // tag number
    id: number;
    // type
    type: string;
    // name
    name: string;
    // user
    user: User['id'][];
}

export interface WatchRecordDocument extends Document, WatchRecord {
    id: number;
}

export const WatchRecordSchema: Schema<WatchRecord> = new Schema({
    id: Number,
    type: String,
    name: String,
    user: [String],
});
