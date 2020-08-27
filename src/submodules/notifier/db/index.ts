import m from 'mongoose';
import chalk from 'chalk';
import log from '@nhentai/utils/logger';

m.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    autoIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
m.connection
    .on('connected', () => log.info(`Connected to ${chalk.bgBlue.yellowBright(m.connection.host)}.`))
    .on('disconnected', () => log.warn(`Disconnected.`))
    .on('err', e => log.error(`Connection error : ${e}`))