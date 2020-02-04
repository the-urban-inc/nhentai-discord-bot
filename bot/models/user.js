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
    } 
});

module.exports = model('User', userSchema);