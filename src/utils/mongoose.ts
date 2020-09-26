import { createConnection } from 'mongoose';
import chalk from 'chalk';
import log from '@nhentai/utils/logger';

export function connectToDatabase() {
    let connection = createConnection(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        autoIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    });
    connection
        .on('connected', () =>
            log.info(`[DATABASE] Connected to ${chalk.bgBlue.yellowBright(connection.host)}.`)
        )
        .on('disconnected', () => log.warn(`[DATABASE] Disconnected.`))
        .on('err', e => log.error(`[DATABASE] Connection error : ${e}`));
    return connection;
}
