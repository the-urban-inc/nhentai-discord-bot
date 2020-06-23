import { config } from 'dotenv'; config();
import type { User } from 'discord.js';
import './db';
import { componentLog } from '@notifier/utils/logger';
import { model as _m, Model } from 'mongoose';
import { WatchRecordSchema, WatchRecordDocument } from "./db/models/record";

const model = _m('Watch', WatchRecordSchema) as Model<WatchRecordDocument>;
const log = new componentLog('Notifier/Main');

(async () => {
    let cache = new Set((await model.find({}).select('id').exec()).map(a => a.id));
    // TODO : watch all this periodically
    process.on('message', async (m : { userId: User["id"], tag: number }) => {
        // registering
        let [_] = await model.find({ id: m.tag }).exec();
        let done = () => log.info(`Registered watcher for user ${m.userId} on tag ${m.tag}.`);
        if (!_) {
            // okay, this is new
            await model.findOneAndUpdate({ id: m.tag, user: [m.userId] }, {
                upsert: true
            }).then(done);
            cache.add(m.tag);
        }
        else {
            _.user = [...new Set(_.user).add(m.userId)];
            _.save().then(done)
        }
    });
})()
