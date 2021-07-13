import { model, Schema, Document } from 'mongoose';
import type { User } from 'discord.js';

export interface IWatchRecord extends Document {
    id: number;
    type: string;
    name: string;
    user: User['id'][];
}

export const WatchRecord: Schema<IWatchRecord> = new Schema({
    id: Number,
    type: String,
    name: String,
    user: [String],
});

export const WatchModel = model<IWatchRecord>('watch', WatchRecord);
