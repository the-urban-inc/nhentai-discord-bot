import { model, Schema } from 'mongoose';

const serverSchema = new Schema({
    serverID: String,
    recent: [{ 
        author: String,
        id: String,
        title: String, 
        date: Date 
    }],
});

export = model('Server', serverSchema);