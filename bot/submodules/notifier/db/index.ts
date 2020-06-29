import m from 'mongoose';
import chalk from 'chalk';
import { componentLog } from '@notifier/utils/logger';

const log = new componentLog(`Notifier/Database`)

m.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    autoIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
m.connection
    .on('connected', () => log.success(`Connected to ${chalk.bgBlue.yellowBright(m.connection.host)}.`))
    .on('disconnected', () => log.warning(`Disconnected.`))
    .on('err', e => log.error(`Connection error : ${e}`))