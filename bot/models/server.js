const { model, Schema } = require('mongoose');

const serverSchema = Schema({
    serverID: String,
    recent: [{ 
        author: String,
        id: String,
        title: String, 
        date: Date 
    }],
});

module.exports = model('Server', serverSchema);