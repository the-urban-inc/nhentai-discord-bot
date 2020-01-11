const mongoose = require('mongoose');
const logger = require('./logger');

module.exports = {
    init: () => {
        mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            autoIndex: true,
            useUnifiedTopology: true
        });
        mongoose.connection.on('connected', () => { logger.info('[DATABASE] Connected to MongoDB successfully!'); });
        mongoose.connection.on('err', err => { logger.error(`[DATABASE] Error connecting mongoose: ${err}`); });
        mongoose.connection.on('disconnected', () => { logger.info('[DATABASE] Mongoose has disconnected from db!'); });
    }
};