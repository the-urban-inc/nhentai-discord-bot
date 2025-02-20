import { model, Document, Schema, SchemaType } from 'mongoose';
import { History, Blacklist, Language } from './tag';

export interface IUser extends Document {
    userID: string;
    points: number;
    level: number;
    favorites: string[];
    history: History[];
    blacklists: Blacklist[];
    anonymous: boolean;
    language: Language;
}

const userSchema = new Schema(
    {
        userID: String,
        points: { $type: Number, default: 0 },
        level: { $type: Number, default: 0 },
        favorites: [String],
        history: [
            {
                id: String,
                type: String,
                name: String,
                author: String,
                guild: String,
                date: Number,
            },
        ],
        blacklists: [
            {
                id: String,
                type: String,
                name: String,
            },
        ],
        anonymous: { $type: Boolean, default: true },
        language: {
            $type: Schema.Types.Mixed, 
            preferred: [{
                id: String,
                name: String,
            }],
            query: { $type: Boolean, default: false },
            follow: { $type: Boolean, default: false },     
        }
    },
    { typeKey: '$type' }
);

export const User = model<IUser>('User', userSchema);
