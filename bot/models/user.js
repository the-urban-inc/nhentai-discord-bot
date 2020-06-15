const { model, Schema } = require('mongoose');

const userSchema = Schema({
    userID: String,
    favorites: [String],
    blacklists: {
        tag: [String],
        artist: [String],
        parody: [String],
        character: [String],
        group: [String],
        language: [String],
        category: [String]
    },
    points: Number,
    history: {
        g: [{
            id: String,
            title: String,
            date: Date
        }],
        tag: [{
            id: String,
            date: Date
        }],
        artist: [{
            id: String,
            date: Date
        }],
        parody: [{
            id: String,
            date: Date
        }],
        character: [{
            id: String,
            date: Date
        }],
        group: [{
            id: String,
            date: Date
        }]
    }
});

module.exports = model('User', userSchema);