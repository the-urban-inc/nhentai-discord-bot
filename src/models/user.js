const { model, Schema } = require('mongoose');

const userSchema = Schema({
    userID: String,
    favorites: [String]
});

module.exports = model('User', userSchema);