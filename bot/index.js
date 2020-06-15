require('dotenv').config();
require('https').createServer().listen(process.env.PORT || 8080);
const Client = require('./struct/Client');
const client = new Client();
client.start();

/* const User = require('./models/user');

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

wipeLeaderboard(); */