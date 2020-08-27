import { model, Document, Schema } from 'mongoose';

interface Tag {
    id: string;
    title: string;
    date?: number;
}

export interface IUser extends Document {
    userID: string;
    favorites: string[];
    blacklists: {
        tag: Tag[];
        artist: Tag[];
        parody: Tag[];
        character: Tag[];
        group: Tag[];
        language: Tag[];
        category: Tag[];
    };
    points: number;
    history: {
        g: Tag[];
        tag: Tag[];
        artist: Tag[];
        parody: Tag[];
        character: Tag[];
        group: Tag[];
        language: Tag[];
    };
}

const userSchema = new Schema({
    userID: String,
    favorites: [String],
    blacklists: {
        tag: [],
        artist: [],
        parody: [],
        character: [],
        group: [],
        language: [],
        category: [],
    },
    points: Number,
    history: {
        g: [],
        tag: [],
        artist: [],
        parody: [],
        character: [],
        group: [],
        language: [],
    },
});

export const User = model<IUser>('User', userSchema);
