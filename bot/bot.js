require('dotenv').config();
require('https').createServer().listen(process.env.PORT || 8080);
const Client = require('./struct/Client');
const client = new Client();
client.start();