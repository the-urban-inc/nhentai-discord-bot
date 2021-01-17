import { createConnection } from 'mongoose';
import chalk from 'chalk';
import { Logger } from '@structures';
const log = new Logger();

export function connectToDatabase() {
    let connection = createConnection(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        autoIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    });
    connection
        .on('connected', () =>
            log.info(`[NOTIFIER] Connected to ${chalk.bgBlue.yellowBright(connection.host)}.`)
        )
        .on('disconnected', () => log.warn(`[NOTIFIER] Disconnected.`))
        .on('err', e => log.error(`[NOTIFIER] Connection error : ${e}`));
    return connection;
}
