import { config } from 'dotenv';
config();
import type { User } from 'discord.js';
import { Model } from 'mongoose';
import { connectToDatabase } from './db';
import { WatchRecord, IWatchRecord } from './db/models/record';
import Watcher from './watcher';
import { Queue } from 'queue-ts';
import { Logger } from '@structures';
const logger = new Logger();

const connection = connectToDatabase();
const WatchModel = connection.model('watch', WatchRecord) as Model<IWatchRecord>;

const log = {
    registered: (user: string, tag: number) =>
        logger.info(`[NOTIFIER] Registered watcher for user ${user} on tag ${tag}.`),
    removed: (user: string, tag: number) =>
        logger.info(`[NOTIFIER] Removed watcher for user ${user} on tag ${tag}.`),
};

async function init() {
    let records = await WatchModel.find({}).select('id').exec();
    let tagIdsToWatch = new Set(records.map(a => a.id));
    let watcher = new Watcher();
    await watcher.setWatch(tagIdsToWatch);
    await watcher.start();
    let workingQueue = new Queue(1);

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
            let subscriberRecord = await WatchModel.findOne({ id: tag }).exec();

            let reset = async () => await watcher.setWatch(tagIdsToWatch);

            // add if not present, remove otherwise
            if (!subscriberRecord)
                // okay, this is new
                workingQueue.add(async () => {
                    let options = { upsert: true },
                        record = { id: tag, type, name, user: [user] };
                    await WatchModel.findOneAndUpdate({ id: tag }, record, options).then(() =>
                        log.registered(user, tag)
                    );
                    tagIdsToWatch.add(tag);
                    await reset();
                    process.send({ tagId: tag, type, name, user, channel, action: 'add' });
                });
            else {
                if (new Set(subscriberRecord.user).has(user))
                    // remove
                    workingQueue.add(async () => {
                        let s = new Set(subscriberRecord.user);
                        s.delete(user);
                        subscriberRecord.user = [...s];
                        subscriberRecord.save().then(() => log.removed(user, tag));
                        await reset();
                        process.send({ tagId: tag, type, name, user, channel, action: 'remove' });
                    });
                // add
                else
                    workingQueue.add(async () => {
                        // dedupe user list
                        let subscribers = subscriberRecord.user;
                        subscribers.push(user);
                        subscriberRecord.user = dedupe(subscribers);
                        subscriberRecord.save().then(() => log.registered(user, tag));
                        await reset();
                        process.send({ tagId: tag, type, name, user, channel, action: 'add' });
                    });
            }
        }
    );
}

/**
 * Dedupe an array of strings
 * @param a array of strings to dedupe
 */
function dedupe(a: string[]) {
    return [...new Set(a)];
}

init();
