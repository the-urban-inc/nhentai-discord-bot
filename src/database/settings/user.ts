import { User as DiscordUser } from 'discord.js';
import { User as U } from '../models/user';
import { History, Blacklist } from '../models/tag';
import { WatchModel } from '../models/record';
import { Logger } from '@structures';
const logger = new Logger();
const log = {
    registered: (user: string, tag: number) =>
        logger.info(`[NOTIFIER] Registered watcher for user ${user} on tag ${tag}.`),
    removed: (user: string, tag: number) =>
        logger.info(`[NOTIFIER] Removed watcher for user ${user} on tag ${tag}.`),
};

export class User {
    async history(userID: DiscordUser['id'], userHistory: History) {
        return await U.findOneAndUpdate(
            { userID },
            { $push: { history: userHistory } },
            { upsert: true }
        ).exec();
    }

    async favorite(userID: DiscordUser['id'], id: string) {
        let adding = false;
        const user = await U.findOne({
            userID,
        }).exec();
        if (!user) {
            await new U({
                userID,
                favorites: [id],
            }).save();
            adding = true;
        } else {
            if (user.favorites.includes(id)) {
                user.favorites.splice(user.favorites.indexOf(id), 1);
            } else {
                user.favorites.push(id);
                adding = true;
            }
            await user.save();
        }
        return adding;
    }

    async blacklist(userID: DiscordUser['id'], info: Blacklist) {
        let adding = false;
        const user = await U.findOne({
            userID,
        }).exec();
        if (!user) {
            await new U({
                userID,
                blacklists: [info],
            }).save();
            adding = true;
        } else {
            const idx = user.blacklists.findIndex(bl => bl.id === info.id);
            if (idx > -1) {
                user.blacklists.splice(idx, 1);
            } else if (idx === -1) {
                user.blacklists.push(info);
                adding = true;
            }
            await user.save();
        }
        return adding;
    }

    async anonymous(userID: DiscordUser['id']) {
        const user = await U.findOne({ userID });
        if (!user) {
            await new U({
                userID,
                anonymous: false,
            }).save();
            return false;
        } else {
            user.anonymous = !user.anonymous;
            await user.save();
            return user.anonymous;
        }
    }

    async follow(userID: DiscordUser['id'], type: string, tag: number, name: string) {
        let subscriberRecord = await WatchModel.findOne({ id: tag }).exec();
        if (!subscriberRecord) {
            let options = { upsert: true },
                record = { id: tag, type, name, user: [userID] };
            await WatchModel.findOneAndUpdate({ id: tag }, record, options).then(() =>
                log.registered(userID, tag)
            );
            return true;
        }
        if (new Set(subscriberRecord.user).has(userID)) {
            let s = new Set(subscriberRecord.user);
            s.delete(userID);
            subscriberRecord.user = [...s];
            subscriberRecord.save().then(() => log.removed(userID, tag));
            return false;
        }
        let subscribers = subscriberRecord.user;
        subscribers.push(userID);
        subscriberRecord.user = [...new Set(subscribers)];
        subscriberRecord.save().then(() => log.registered(userID, tag));
        return true;
    }
}
