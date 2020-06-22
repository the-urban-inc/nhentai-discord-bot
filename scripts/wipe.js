require('dotenv').config();
require('../bot/utils/mongoose').init();
const User = require('../bot/models/user');

wipeLeaderboard = async () => {
    await User.update({}, { $set: { "points" : 0 } }, { multi: true });
    await User.update({}, { $set: { "history" : {
        g: [],
        tag: [],
        artist: [],
        parody: [],
        character: [],
        group: []
    } } }, { multi: true });
}

wipeLeaderboard();