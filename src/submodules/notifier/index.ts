import { config } from 'dotenv';
config();
import type { User } from 'discord.js';
import './db';
import log from '@nhentai/utils/logger';
import { model as _m, Model } from 'mongoose';
import { WatchRecordSchema, WatchRecordDocument } from './db/models/record';
import w from './watcher';
import { Queue } from 'queue-ts';

export const model = _m('watch', WatchRecordSchema) as Model<WatchRecordDocument>;

(async () => {
    let cache = new Set((await model.find({}).select('id').exec()).map(a => a.id));
    let watch = await (await new w().setWatch(cache)).start();
    let work = new Queue(1);

    process.on(
        'message',
        async (m: {
            user: User['id'];
            channel: string;
            tag: number;
            type: string;
            name: string;
        }) => {
            // registering
            const { user, channel, tag, type, name } = m;
            let [_] = await model.find({ id: tag }).exec();
            let done = () => {
                log.info(`Registered watcher for user ${user} on tag ${tag}.`);
            };
            let done2 = () => {
                log.info(`Removed watcher for user ${user} on tag ${tag}.`);
            };
            let reset = async () => await (await watch.setWatch(cache)).start();

            // add if not present, remove otherwise
            if (!_)
                // okay, this is new
                work.add(async () => {
                    await model
                        .findOneAndUpdate(
                            { id: tag },
                            { id: tag, type, name, user: [user] },
                            {
                                upsert: true,
                            }
                        )
                        .then(done);
                    cache.add(tag);
                    await reset();
                    process.send({ tagId: tag, type, name, user, channel, action: 'add' });
                });
            else {
                if (new Set(_.user).has(user))
                    // remove
                    work.add(async () => {
                        let s = new Set(_.user);
                        s.delete(user);
                        _.user = [...s];
                        _.save().then(done2);
                        await reset();
                        process.send({ tagId: tag, type, name, user, channel, action: 'remove' });
                    });
                // add
                else
                    work.add(async () => {
                        _.user = [...new Set(_.user).add(user)];
                        _.save().then(done);
                        await reset();
                        process.send({ tagId: tag, type, name, user, channel, action: 'add' });
                    });
            }
        }
    );
})();
