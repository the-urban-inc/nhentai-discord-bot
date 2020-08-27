import { model, Document, Schema } from 'mongoose';

interface Tag {
    id: string,
    title: string,
    date?: number
}

export interface IUser extends Document {
    userID: string,
    favorites: Array<string>,
    blacklists: {
        tag: Array<Tag>,
        artist: Array<Tag>,
        parody: Array<Tag>,
        character: Array<Tag>,
        group: Array<Tag>,
        language: Array<Tag>,
        category: Array<Tag>
    },
    points: number,
    history: {
        g: Array<Tag>,
        tag: Array<Tag>,
        artist: Array<Tag>,
        parody: Array<Tag>,
        character: Array<Tag>,
        group: Array<Tag>
    }
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
        category: []
    },
    points: Number,
    history: {
        g: [],
        tag: [],
        artist: [],
        parody: [],
        character: [],
        group: []
    }
});

export const User = model<IUser>('User', userSchema);