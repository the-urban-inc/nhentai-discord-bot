import { config } from 'dotenv'; config();
import type { User } from 'discord.js';
import './db';
import log from '@nhentai/utils/logger'
import { model as _m, Model } from 'mongoose';
import { WatchRecordSchema, WatchRecordDocument } from "./db/models/record";
import w from './watcher';
import { Queue } from 'queue-ts';

export const model = _m('watch', WatchRecordSchema) as Model<WatchRecordDocument>;
enum OP {
    ADD = 0,
    REMOVE = 1
}

(async () => {
    let cache = new Set((await model.find({}).select('id').exec()).map(a => a.id));
    let watch = await (await new w().setWatch(cache)).start();
    let work = new Queue(1);

    process.on('message', async (m : { userId: User["id"], tag: number, op: OP }) => {
        // registering
        let [_] = await model.find({ id: m.tag }).exec();
        let done = () => {
            log.info(`Registered watcher for user ${m.userId} on tag ${m.tag}.`);
        };
        let done2 = () => {
            log.info(`Removed watcher for user ${m.userId} on tag ${m.tag}.`);
        }; 
        let reset = async () => await (await watch.setWatch(cache)).start();

        switch (m.op) {
            case OP.ADD:
                if (!_) 
                    // okay, this is new
                    work.add(async () => {
                        await model.findOneAndUpdate({ id: m.tag }, { id: m.tag, user: [m.userId] }, {
                            upsert: true
                        }).then(done);
                        cache.add(m.tag);
                        await reset();
                    })
                else 
                    work.add(async () => {
                        _.user = [...new Set(_.user).add(m.userId)];
                        _.save().then(done);
                        await reset();
                    });
                return;
            case OP.REMOVE:
                if (!_) return;
                else
                    work.add(async () => {
                        let s = new Set(_.user);
                        s.delete(m.userId);
                        _.user = [...s];
                        _.save().then(done2);
                        await reset();
                    });
        }
    });
})()
