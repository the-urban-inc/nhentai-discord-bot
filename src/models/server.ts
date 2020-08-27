import { model, Document, Schema } from 'mongoose';

interface Recent {
    author: string,
    id: string,
    title: string,
    date: number
}

export interface IServer extends Document {
    serverID: string,
    recent: Array<Recent>
}

const serverSchema = new Schema({
    serverID: String,
    recent: [{ 
        author: String,
        id: String,
        title: String, 
        date: Number
    }],
});

export const Server = model<IServer>('Server', serverSchema);