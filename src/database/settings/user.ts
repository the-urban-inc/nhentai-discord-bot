import { User as DiscordUser } from 'discord.js';
import { User as U } from '../models/user';
import { History, Blacklist } from '../models/tag';

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
}
