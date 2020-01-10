const mongoose = require('mongoose');
const logger = require('./logger');

module.exports = {
    init: () => {
        mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            autoIndex: true,
            useUnifiedTopology: true
        });
        mongoose.connection.on('connected', () => { logger.info('[DB] Connected to db successfully!'); });
        mongoose.connection.on('err', err => { logger.error(`[DB] Error connecting mongoose: ${err}`); });
        mongoose.connection.on('disconnected', () => { logger.info('[DB] Mongoose has disconnected from db!'); });
    }
};