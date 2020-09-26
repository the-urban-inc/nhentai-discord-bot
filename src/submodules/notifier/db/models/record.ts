import { model, Schema, Document } from 'mongoose';
import type { User } from 'discord.js';

export interface IWatchRecord extends Document {
    // tag number
    id: number;
    // type
    type: string;
    // name
    name: string;
    // user
    user: User['id'][];
}

export const WatchRecord: Schema<IWatchRecord> = new Schema({
    id: Number,
    type: String,
    name: String,
    user: [String],
});

export const WatchModel = model<IWatchRecord>('watch', WatchRecord);
